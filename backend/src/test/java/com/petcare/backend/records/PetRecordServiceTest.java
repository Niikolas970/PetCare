package com.petcare.backend.records;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import com.petcare.backend.common.BusinessRuleException;
import com.petcare.backend.common.ForbiddenException;
import com.petcare.backend.common.ResourceNotFoundException;
import com.petcare.backend.households.HouseholdAccessService;
import com.petcare.backend.households.HouseholdClock;
import com.petcare.backend.pets.Pet;
import com.petcare.backend.pets.PetService;
import com.petcare.backend.records.RecordRequests.DoseVoided;
import com.petcare.backend.records.RecordRequests.VoidRecord;
import com.petcare.backend.tasks.CareTaskService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PetRecordServiceTest {

    private static final Long OWNER = 1L;
    private static final Long CAREGIVER = 2L;
    private static final Long HOUSEHOLD = 10L;
    private static final Long PET = 5L;
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 3, 18, 0);

    @Mock private PetService petService;
    @Mock private HouseholdAccessService accessService;
    @Mock private HouseholdClock clock;
    @Mock private CareTaskService careTaskService;
    @Mock private HealthRecordRepository healthRecordRepository;
    @Mock private PreventiveDoseRepository doseRepository;
    @Mock private TreatmentRepository treatmentRepository;
    @Mock private MealRepository mealRepository;
    @Mock private WeightRecordRepository weightRepository;
    @Mock private WellbeingLogRepository wellbeingRepository;

    private PetRecordService service;
    private Pet pet;

    @BeforeEach
    void setUp() {
        service = new PetRecordService(petService, accessService, clock, careTaskService, healthRecordRepository,
                doseRepository, treatmentRepository, mealRepository, weightRepository, wellbeingRepository);
        pet = new Pet();
        pet.setId(PET);
        pet.setHouseholdId(HOUSEHOLD);

        lenient().when(petService.getById(any(), any())).thenReturn(pet);
        lenient().when(petService.requireWritable(any(), any())).thenReturn(pet);
        lenient().when(clock.now(HOUSEHOLD)).thenReturn(NOW);
        lenient().when(doseRepository.save(any(PreventiveDose.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("Anular una dosis la deja VOIDED con trazabilidad y cancela su tarea de próxima dosis")
    void voidDoseCancelsItsTask() {
        PreventiveDose dose = givenDose(30L, RecordStatus.ACTIVE);
        when(careTaskService.cancelPendingForDose(30L)).thenReturn(List.of(99L));

        DoseVoided result = service.voidDose(PET, 30L, OWNER, new VoidRecord("  Registrada por error  "));

        assertThat(result.dose().getStatus()).isEqualTo(RecordStatus.VOIDED);
        assertThat(dose.getVoidedBy()).isEqualTo(OWNER);
        assertThat(dose.getVoidedAt()).isEqualTo(NOW);
        assertThat(dose.getVoidReason()).isEqualTo("Registrada por error");
        assertThat(result.cancelledTaskIds()).containsExactly(99L);
    }

    @Test
    @DisplayName("Un CAREGIVER no puede anular (403) y la tarea no se toca")
    void caregiverCannotVoid() {
        givenDose(30L, RecordStatus.ACTIVE);
        when(accessService.requireOwner(HOUSEHOLD, CAREGIVER)).thenThrow(new ForbiddenException());

        assertThatThrownBy(() -> service.voidDose(PET, 30L, CAREGIVER, null)).isInstanceOf(ForbiddenException.class);
        verify(careTaskService, never()).cancelPendingForDose(any());
    }

    @Test
    @DisplayName("Anular dos veces responde 409")
    void voidingTwiceIsAConflict() {
        givenDose(30L, RecordStatus.VOIDED);

        assertThatThrownBy(() -> service.voidDose(PET, 30L, OWNER, null))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("El registro ya está anulado");
    }

    @Test
    @DisplayName("Una dosis de otra mascota responde 404")
    void doseOfAnotherPetIsNotFound() {
        PreventiveDose dose = new PreventiveDose();
        dose.setId(30L);
        dose.setPetId(999L);
        when(doseRepository.findById(30L)).thenReturn(Optional.of(dose));

        assertThatThrownBy(() -> service.voidDose(PET, 30L, OWNER, null)).isInstanceOf(ResourceNotFoundException.class);
    }

    private PreventiveDose givenDose(Long id, RecordStatus status) {
        PreventiveDose dose = new PreventiveDose();
        dose.setId(id);
        dose.setPetId(PET);
        dose.setKind(DoseKind.VACCINE);
        dose.setProductName("Rabia");
        dose.setStatus(status);
        when(doseRepository.findById(id)).thenReturn(Optional.of(dose));
        return dose;
    }
}
