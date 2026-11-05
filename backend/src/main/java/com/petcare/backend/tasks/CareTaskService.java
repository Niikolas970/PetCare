package com.petcare.backend.tasks;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import com.petcare.backend.common.BadRequestException;
import com.petcare.backend.common.BusinessRuleException;
import com.petcare.backend.common.EnumParams;
import com.petcare.backend.common.ResourceNotFoundException;
import com.petcare.backend.households.HouseholdAccessService;
import com.petcare.backend.households.HouseholdClock;
import com.petcare.backend.pets.Pet;
import com.petcare.backend.pets.PetService;
import com.petcare.backend.records.DoseKind;
import com.petcare.backend.records.PreventiveDose;
import com.petcare.backend.tasks.CareTaskRequests.CompleteCareTask;
import com.petcare.backend.tasks.CareTaskRequests.RescheduleCareTask;
import com.petcare.backend.tasks.CareTaskRequests.SaveCareTask;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CareTaskService {

    public static final int DEFAULT_DAYS = 7;
    private static final int MAX_DAYS = 365;
    static final int MAX_RANGE_DAYS = 366;

    // Hora a la que se agenda la tarea generada por una vacuna/desparasitación
    private static final LocalTime GENERATED_TASK_TIME = LocalTime.of(9, 0);

    private final CareTaskRepository taskRepository;
    private final PetService petService;
    private final HouseholdAccessService accessService;
    private final HouseholdClock clock;

    public CareTaskService(CareTaskRepository taskRepository, PetService petService,
                           HouseholdAccessService accessService, HouseholdClock clock) {
        this.taskRepository = taskRepository;
        this.petService = petService;
        this.accessService = accessService;
        this.clock = clock;
    }

    // ---------- Tareas de una mascota ----------

    @Transactional(readOnly = true)
    public List<CareTaskResponse> listForPet(Long petId, Long userId, String statusParam) {
        Pet pet = petService.getById(petId, userId);
        CareTaskStatus status = EnumParams.parse(CareTaskStatus.class, statusParam, "status");

        List<CareTask> tasks = status == null
                ? taskRepository.findByPetIdOrderByDueAtAsc(petId)
                : taskRepository.findByPetIdAndStatusOrderByDueAtAsc(petId, status);

        LocalDateTime now = clock.now(pet.getHouseholdId());
        return tasks.stream().map(t -> CareTaskResponse.of(t, pet.getName(), now)).toList();
    }

    @Transactional
    public CareTaskResponse create(Long petId, Long userId, SaveCareTask request) {
        Pet pet = petService.requireWritable(petId, userId);

        CareTask task = new CareTask();
        task.setPetId(pet.getId());
        task.setCreatedBy(userId);
        applyDetails(task, request);

        return toResponse(taskRepository.save(task), pet);
    }

    @Transactional
    public CareTaskResponse update(Long petId, Long taskId, Long userId, SaveCareTask request) {
        Pet pet = petService.getById(petId, userId);
        CareTask task = requirePending(requireTask(petId, taskId), "editar");

        applyDetails(task, request);

        return toResponse(taskRepository.save(task), pet);
    }

    @Transactional
    public CareTaskResponse complete(Long petId, Long taskId, Long userId, CompleteCareTask request) {
        Pet pet = petService.getById(petId, userId);
        CareTask task = requirePending(requireTask(petId, taskId), "completar");

        LocalDateTime now = clock.now(pet.getHouseholdId());
        LocalDateTime completedAt = request != null && request.completedAt() != null ? request.completedAt() : now;
        if (completedAt.isAfter(now)) {
            throw new BadRequestException("La fecha de completado no puede ser futura");
        }

        task.setStatus(CareTaskStatus.COMPLETED);
        task.setCompletedAt(completedAt);
        task.setCompletedBy(userId);
        if (request != null && request.notes() != null && !request.notes().isBlank()) {
            task.setNotes(appendNote(task.getNotes(), "Al completar: " + request.notes().trim()));
        }

        return toResponse(taskRepository.save(task), pet);
    }

    @Transactional
    public CareTaskResponse cancel(Long petId, Long taskId, Long userId) {
        Pet pet = petService.getById(petId, userId);
        CareTask task = requirePending(requireTask(petId, taskId), "cancelar");

        task.setStatus(CareTaskStatus.CANCELLED);

        return toResponse(taskRepository.save(task), pet);
    }

    @Transactional
    public CareTaskResponse reschedule(Long petId, Long taskId, Long userId, RescheduleCareTask request) {
        Pet pet = petService.getById(petId, userId);
        CareTask task = requirePending(requireTask(petId, taskId), "reprogramar");

        task.setDueAt(request.dueAt());

        return toResponse(taskRepository.save(task), pet);
    }

    /**
     * Tarea PENDING generada al registrar una vacuna o desparasitación con próxima dosis.
     */
    @Transactional
    public CareTask createForDose(Pet pet, PreventiveDose dose, Long userId) {
        boolean vaccine = dose.getKind() == DoseKind.VACCINE;

        CareTask task = new CareTask();
        task.setPetId(pet.getId());
        task.setType(vaccine ? CareTaskType.VACCINE : CareTaskType.DEWORMING);
        task.setTitle((vaccine ? "Próxima vacuna: " : "Próxima desparasitación: ") + dose.getProductName());
        task.setDueAt(dose.getNextDueOn().atTime(GENERATED_TASK_TIME));
        task.setNotes("Generada automáticamente desde el registro del " + dose.getOccurredAt().toLocalDate());
        task.setCreatedBy(userId);
        task.setSourceDoseId(dose.getId());

        return taskRepository.save(task);
    }

    /**
     * Al anular una dosis, su tarea de próxima dosis deja de tener sentido: las PENDING pasan a CANCELLED.
     * Las COMPLETED se conservan (ya ocurrieron). Devuelve los ids cancelados.
     */
    @Transactional
    public List<Long> cancelPendingForDose(Long doseId) {
        List<CareTask> pending = taskRepository.findBySourceDoseIdAndStatus(doseId, CareTaskStatus.PENDING);
        pending.forEach(task -> {
            task.setStatus(CareTaskStatus.CANCELLED);
            task.setNotes(appendNote(task.getNotes(), "Cancelada automáticamente: se anuló la dosis que la generó."));
        });
        taskRepository.saveAll(pending);
        return pending.stream().map(CareTask::getId).toList();
    }

    // ---------- Tareas del hogar ----------

    @Transactional(readOnly = true)
    public List<CareTaskResponse> listForHousehold(Long householdId, Long userId, String rangeParam, Integer days) {
        return listForHousehold(householdId, userId, rangeParam, days, null, null);
    }

    /**
     * from/to (días en la hora del hogar, ambos incluidos) limitan range=all a una ventana de fechas:
     * el calendario pide solo lo visible. Van juntos, from ≤ to, máximo MAX_RANGE_DAYS días.
     */
    @Transactional(readOnly = true)
    public List<CareTaskResponse> listForHousehold(Long householdId, Long userId, String rangeParam, Integer days,
                                                   LocalDate from, LocalDate to) {
        accessService.requireMember(householdId, userId);

        TaskRange parsed = EnumParams.parse(TaskRange.class, rangeParam, "range");
        boolean dated = validateDateRange(from, to, parsed);
        TaskRange range = dated ? TaskRange.ALL : Optional.ofNullable(parsed).orElse(TaskRange.UPCOMING);
        int window = validateDays(days);

        Map<Long, String> petNames = activePetNames(householdId);
        if (petNames.isEmpty()) {
            return List.of();
        }

        LocalDateTime now = clock.now(householdId);
        if (dated) {
            return taskRepository.findByPetIdInAndDueAtBetweenOrderByDueAtAsc(
                            petNames.keySet(), from.atStartOfDay(), to.atTime(LocalTime.of(23, 59, 59)))
                    .stream().map(t -> CareTaskResponse.of(t, petNames.get(t.getPetId()), now)).toList();
        }
        List<CareTask> tasks = switch (range) {
            case UPCOMING -> taskRepository.findByPetIdInAndStatusAndDueAtBetweenOrderByDueAtAsc(
                    petNames.keySet(), CareTaskStatus.PENDING, now, endOfWindow(householdId, window));
            case OVERDUE -> taskRepository.findByPetIdInAndStatusAndDueAtBeforeOrderByDueAtAsc(
                    petNames.keySet(), CareTaskStatus.PENDING, now);
            case ALL -> taskRepository.findByPetIdInOrderByDueAtAsc(petNames.keySet());
        };

        return tasks.stream().map(t -> CareTaskResponse.of(t, petNames.get(t.getPetId()), now)).toList();
    }

    // ---------- Apoyo para el panel (el llamador ya validó la pertenencia) ----------

    @Transactional(readOnly = true)
    public long countUpcoming(Long householdId, Collection<Long> petIds, int days) {
        if (petIds.isEmpty()) {
            return 0;
        }
        return taskRepository.countByPetIdInAndStatusAndDueAtBetween(petIds, CareTaskStatus.PENDING,
                clock.now(householdId), endOfWindow(householdId, days));
    }

    @Transactional(readOnly = true)
    public long countOverdue(Long householdId, Collection<Long> petIds) {
        if (petIds.isEmpty()) {
            return 0;
        }
        return taskRepository.countByPetIdInAndStatusAndDueAtBefore(petIds, CareTaskStatus.PENDING,
                clock.now(householdId));
    }

    // La próxima tarea pendiente (la más antigua primero, así una vencida no queda oculta)
    @Transactional(readOnly = true)
    public Optional<CareTaskResponse> nextPending(Pet pet, LocalDateTime now) {
        return taskRepository.findFirstByPetIdAndStatusOrderByDueAtAsc(pet.getId(), CareTaskStatus.PENDING)
                .map(t -> CareTaskResponse.of(t, pet.getName(), now));
    }

    // ---------- Internos ----------

    private CareTask requireTask(Long petId, Long taskId) {
        return taskRepository.findByIdAndPetId(taskId, petId)
                .orElseThrow(() -> new ResourceNotFoundException("La tarea con id " + taskId + " no existe"));
    }

    private CareTask requirePending(CareTask task, String action) {
        if (task.getStatus() != CareTaskStatus.PENDING) {
            throw new BusinessRuleException("Solo se puede " + action + " una tarea pendiente. Esta tarea está "
                    + statusLabel(task.getStatus()) + ".");
        }
        return task;
    }

    private void applyDetails(CareTask task, SaveCareTask request) {
        task.setType(request.type());
        task.setTitle(request.title().trim());
        task.setDueAt(request.dueAt());
        task.setLocation(request.location());
        task.setNotes(request.notes());
    }

    private CareTaskResponse toResponse(CareTask task, Pet pet) {
        return CareTaskResponse.of(task, pet.getName(), clock.now(pet.getHouseholdId()));
    }

    private Map<Long, String> activePetNames(Long householdId) {
        return petService.listActiveInHousehold(householdId).stream()
                .collect(Collectors.toMap(Pet::getId, Pet::getName, (a, b) -> a, LinkedHashMap::new));
    }

    // Hasta el final del día (hoy + days) en la zona del hogar
    private LocalDateTime endOfWindow(Long householdId, int days) {
        LocalDate lastDay = clock.today(householdId).plusDays(days);
        return lastDay.atTime(LocalTime.of(23, 59, 59));
    }

    // true si hay ventana de fechas válida; 400 si está a medias, invertida, es demasiado larga o choca con range
    private static boolean validateDateRange(LocalDate from, LocalDate to, TaskRange range) {
        if (from == null && to == null) {
            return false;
        }
        if (from == null || to == null) {
            throw new BadRequestException("Indica from y to juntos (formato AAAA-MM-DD)");
        }
        if (from.isAfter(to)) {
            throw new BadRequestException("La fecha 'from' no puede ser posterior a 'to'");
        }
        if (ChronoUnit.DAYS.between(from, to) + 1 > MAX_RANGE_DAYS) {
            throw new BadRequestException("El rango entre from y to no puede superar " + MAX_RANGE_DAYS + " días");
        }
        if (range != null && range != TaskRange.ALL) {
            throw new BadRequestException("from y to solo se pueden usar con range=all");
        }
        return true;
    }

    private int validateDays(Integer days) {
        int value = days == null ? DEFAULT_DAYS : days;
        if (value < 1 || value > MAX_DAYS) {
            throw new BadRequestException("El parámetro days debe estar entre 1 y " + MAX_DAYS);
        }
        return value;
    }

    private static String appendNote(String existing, String note) {
        return existing == null || existing.isBlank() ? note : existing + "\n" + note;
    }

    private static String statusLabel(CareTaskStatus status) {
        return switch (status) {
            case PENDING -> "pendiente";
            case COMPLETED -> "completada";
            case CANCELLED -> "cancelada";
        };
    }
}
