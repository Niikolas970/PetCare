package com.petcare.backend.tasks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import com.petcare.backend.common.BadRequestException;
import com.petcare.backend.common.BusinessRuleException;
import com.petcare.backend.common.ResourceNotFoundException;
import com.petcare.backend.households.HouseholdAccessService;
import com.petcare.backend.households.HouseholdClock;
import com.petcare.backend.pets.Pet;
import com.petcare.backend.pets.PetService;
import com.petcare.backend.records.DoseKind;
import com.petcare.backend.records.PreventiveDose;
import com.petcare.backend.tasks.CareTaskRequests.CompleteCareTask;
import com.petcare.backend.tasks.CareTaskRequests.RescheduleCareTask;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CareTaskServiceTest {

    private static final Long USER = 1L;
    private static final Long HOUSEHOLD = 10L;
    private static final Long PET = 5L;
    // "Ahora" en la zona horaria del hogar
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 2, 10, 0);

    @Mock
    private CareTaskRepository taskRepository;
    @Mock
    private PetService petService;
    @Mock
    private HouseholdAccessService accessService;
    @Mock
    private HouseholdClock clock;

    private CareTaskService service;
    private Pet pet;

    @BeforeEach
    void setUp() {
        service = new CareTaskService(taskRepository, petService, accessService, clock);

        pet = new Pet();
        pet.setId(PET);
        pet.setHouseholdId(HOUSEHOLD);
        pet.setName("Coco");

        lenient().when(clock.now(HOUSEHOLD)).thenReturn(NOW);
        lenient().when(petService.getById(PET, USER)).thenReturn(pet);
        lenient().when(taskRepository.save(any(CareTask.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ---------- Completar ----------

    @Test
    @DisplayName("Completar una tarea PENDING guarda estado, fecha (hora del hogar) y quién la completó")
    void completePendingTask() {
        givenTask(1L, CareTaskStatus.PENDING, NOW.minusHours(2));

        CareTaskResponse response = service.complete(PET, 1L, USER, null);

        assertThat(response.status()).isEqualTo(CareTaskStatus.COMPLETED);
        assertThat(response.completedAt()).isEqualTo(NOW);
        assertThat(response.completedBy()).isEqualTo(USER);
        assertThat(response.overdue()).isFalse();
    }

    @Test
    void completeAcceptsAPastDateAndAppendsNotes() {
        CareTask task = givenTask(1L, CareTaskStatus.PENDING, NOW.minusDays(1));
        task.setNotes("Llevar carné");

        CareTaskResponse response = service.complete(PET, 1L, USER,
                new CompleteCareTask(NOW.minusHours(3), "Todo en orden"));

        assertThat(response.completedAt()).isEqualTo(NOW.minusHours(3));
        assertThat(response.notes()).isEqualTo("Llevar carné\nAl completar: Todo en orden");
    }

    @Test
    @DisplayName("Completar una tarea ya completada → 409")
    void completingTwiceFails() {
        givenTask(1L, CareTaskStatus.COMPLETED, NOW.minusDays(1));

        assertThatThrownBy(() -> service.complete(PET, 1L, USER, null))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("completada");
        verify(taskRepository, never()).save(any());
    }

    @Test
    void completedAtCannotBeInTheFuture() {
        givenTask(1L, CareTaskStatus.PENDING, NOW);

        assertThatThrownBy(() -> service.complete(PET, 1L, USER, new CompleteCareTask(NOW.plusMinutes(1), null)))
                .isInstanceOf(BadRequestException.class);
        verify(taskRepository, never()).save(any());
    }

    // ---------- Cancelar y reprogramar ----------

    @Test
    void cancelPendingTask() {
        givenTask(1L, CareTaskStatus.PENDING, NOW.minusDays(2));

        CareTaskResponse response = service.cancel(PET, 1L, USER);

        assertThat(response.status()).isEqualTo(CareTaskStatus.CANCELLED);
        assertThat(response.overdue()).as("una tarea cancelada no cuenta como vencida").isFalse();
    }

    @Test
    void cancellingACancelledTaskFails() {
        givenTask(1L, CareTaskStatus.CANCELLED, NOW.plusDays(1));

        assertThatThrownBy(() -> service.cancel(PET, 1L, USER))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("cancelada");
    }

    @Test
    void cancellingACompletedTaskFails() {
        givenTask(1L, CareTaskStatus.COMPLETED, NOW.plusDays(1));

        assertThatThrownBy(() -> service.cancel(PET, 1L, USER)).isInstanceOf(BusinessRuleException.class);
    }

    @Test
    @DisplayName("Reprogramar una tarea cancelada → 409")
    void reschedulingACancelledTaskFails() {
        givenTask(1L, CareTaskStatus.CANCELLED, NOW.plusDays(1));

        assertThatThrownBy(() -> service.reschedule(PET, 1L, USER, new RescheduleCareTask(NOW.plusDays(5))))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("reprogramar");
        verify(taskRepository, never()).save(any());
    }

    @Test
    void reschedulingAnOverdueTaskClearsOverdue() {
        givenTask(1L, CareTaskStatus.PENDING, NOW.minusDays(1));

        CareTaskResponse response = service.reschedule(PET, 1L, USER, new RescheduleCareTask(NOW.plusDays(5)));

        assertThat(response.dueAt()).isEqualTo(NOW.plusDays(5));
        assertThat(response.overdue()).isFalse();
    }

    // ---------- overdue (calculado) ----------

    @Test
    @DisplayName("overdue = PENDING y due_at < ahora; nunca se completa sola")
    void overdueIsComputedAndNotPersisted() {
        CareTask pastPending = task(1L, CareTaskStatus.PENDING, NOW.minusMinutes(1));
        CareTask futurePending = task(2L, CareTaskStatus.PENDING, NOW.plusMinutes(1));
        CareTask pastCompleted = task(3L, CareTaskStatus.COMPLETED, NOW.minusDays(3));
        CareTask pastCancelled = task(4L, CareTaskStatus.CANCELLED, NOW.minusDays(3));
        when(taskRepository.findByPetIdOrderByDueAtAsc(PET))
                .thenReturn(List.of(pastCompleted, pastCancelled, pastPending, futurePending));

        List<CareTaskResponse> tasks = service.listForPet(PET, USER, null);

        assertThat(tasks).extracting(CareTaskResponse::id, CareTaskResponse::overdue)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(3L, false),
                        org.assertj.core.groups.Tuple.tuple(4L, false),
                        org.assertj.core.groups.Tuple.tuple(1L, true),
                        org.assertj.core.groups.Tuple.tuple(2L, false));
        assertThat(pastPending.getStatus()).as("la tarea vencida sigue PENDING").isEqualTo(CareTaskStatus.PENDING);
        verify(taskRepository, never()).save(any());
    }

    @Test
    void taskDueExactlyNowIsNotOverdueYet() {
        assertThat(task(1L, CareTaskStatus.PENDING, NOW).isOverdueAt(NOW)).isFalse();
    }

    // ---------- Acceso y filtros ----------

    @Test
    @DisplayName("Una tarea de otra mascota responde 404")
    void taskOfAnotherPetIsNotFound() {
        when(taskRepository.findByIdAndPetId(1L, PET)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.complete(PET, 1L, USER, null))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Sin acceso a la mascota no se consulta ninguna tarea")
    void noAccessToPetMeansNoTaskAccess() {
        when(petService.getById(PET, 2L)).thenThrow(new ResourceNotFoundException("La mascota con id 5 no existe"));

        assertThatThrownBy(() -> service.cancel(PET, 1L, 2L)).isInstanceOf(ResourceNotFoundException.class);
        verifyNoInteractions(taskRepository);
    }

    @Test
    void invalidStatusFilterIsABadRequest() {
        assertThatThrownBy(() -> service.listForPet(PET, USER, "VENCIDA"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("status");
    }

    @Test
    void householdRangeAndDaysAreValidated() {
        assertThatThrownBy(() -> service.listForHousehold(HOUSEHOLD, USER, "mañana", 7))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.listForHousehold(HOUSEHOLD, USER, "upcoming", 0))
                .isInstanceOf(BadRequestException.class);
    }

    // ---------- Tarea generada por vacuna ----------

    @Test
    @DisplayName("Una vacuna con next_due_on genera una tarea PENDING tipo VACCINE para esa fecha")
    void doseWithNextDueOnCreatesPendingTask() {
        PreventiveDose dose = new PreventiveDose();
        dose.setKind(DoseKind.VACCINE);
        dose.setProductName("Rabia");
        dose.setOccurredAt(NOW);
        dose.setNextDueOn(LocalDate.of(2027, 11, 2));

        CareTask task = service.createForDose(pet, dose, USER);

        assertThat(task.getType()).isEqualTo(CareTaskType.VACCINE);
        assertThat(task.getStatus()).isEqualTo(CareTaskStatus.PENDING);
        assertThat(task.getDueAt()).isEqualTo(LocalDateTime.of(2027, 11, 2, 9, 0));
        assertThat(task.getPetId()).isEqualTo(PET);
        assertThat(task.getCreatedBy()).isEqualTo(USER);
        assertThat(task.getTitle()).contains("Rabia");
    }

    @Test
    void dewormingCreatesADewormingTask() {
        PreventiveDose dose = new PreventiveDose();
        dose.setKind(DoseKind.DEWORMING);
        dose.setProductName("Antiparasitario");
        dose.setOccurredAt(NOW);
        dose.setNextDueOn(LocalDate.of(2027, 2, 2));

        assertThat(service.createForDose(pet, dose, USER).getType()).isEqualTo(CareTaskType.DEWORMING);
    }

    private CareTask givenTask(Long id, CareTaskStatus status, LocalDateTime dueAt) {
        CareTask task = task(id, status, dueAt);
        when(taskRepository.findByIdAndPetId(id, PET)).thenReturn(Optional.of(task));
        return task;
    }

    private static CareTask task(Long id, CareTaskStatus status, LocalDateTime dueAt) {
        CareTask task = new CareTask();
        task.setId(id);
        task.setPetId(PET);
        task.setType(CareTaskType.VET_APPOINTMENT);
        task.setTitle("Control");
        task.setDueAt(dueAt);
        task.setStatus(status);
        task.setCreatedBy(USER);
        return task;
    }
}
