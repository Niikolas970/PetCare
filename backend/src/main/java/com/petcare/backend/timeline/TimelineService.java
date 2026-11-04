package com.petcare.backend.timeline;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import com.petcare.backend.common.BadRequestException;
import com.petcare.backend.common.EnumParams;
import com.petcare.backend.households.HouseholdClock;
import com.petcare.backend.pets.Pet;
import com.petcare.backend.pets.PetService;
import com.petcare.backend.records.DoseKind;
import com.petcare.backend.records.HealthRecord;
import com.petcare.backend.records.HealthRecordRepository;
import com.petcare.backend.records.Meal;
import com.petcare.backend.records.MealRepository;
import com.petcare.backend.records.PreventiveDose;
import com.petcare.backend.records.PreventiveDoseRepository;
import com.petcare.backend.records.RecordStatus;
import com.petcare.backend.records.Treatment;
import com.petcare.backend.records.TreatmentRepository;
import com.petcare.backend.records.WeightRecord;
import com.petcare.backend.records.WeightRecordRepository;
import com.petcare.backend.records.WellbeingLog;
import com.petcare.backend.records.WellbeingLogRepository;
import com.petcare.backend.tasks.CareTask;
import com.petcare.backend.tasks.CareTaskRepository;
import com.petcare.backend.users.User;
import com.petcare.backend.users.UserRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Une en una sola lista los registros de salud, vacunas, tratamientos, comidas,
 * pesos, bienestar y tareas de una mascota.
 */
@Service
@Transactional(readOnly = true)
public class TimelineService {

    // Límites de DATETIME en MySQL cuando no se envía from/to
    private static final LocalDateTime MIN_DATE = LocalDateTime.of(1000, 1, 1, 0, 0);
    private static final LocalDateTime MAX_DATE = LocalDateTime.of(9999, 12, 31, 23, 59, 59);

    private static final Comparator<Entry> NEWEST_FIRST =
            Comparator.comparing(Entry::date).reversed().thenComparing(Entry::id, Comparator.reverseOrder());

    private final PetService petService;
    private final HouseholdClock clock;
    private final UserRepository userRepository;
    private final HealthRecordRepository healthRecordRepository;
    private final PreventiveDoseRepository doseRepository;
    private final TreatmentRepository treatmentRepository;
    private final MealRepository mealRepository;
    private final WeightRecordRepository weightRepository;
    private final WellbeingLogRepository wellbeingRepository;
    private final CareTaskRepository taskRepository;

    public TimelineService(PetService petService, HouseholdClock clock, UserRepository userRepository,
                           HealthRecordRepository healthRecordRepository,
                           PreventiveDoseRepository doseRepository,
                           TreatmentRepository treatmentRepository,
                           MealRepository mealRepository,
                           WeightRecordRepository weightRepository,
                           WellbeingLogRepository wellbeingRepository,
                           CareTaskRepository taskRepository) {
        this.petService = petService;
        this.clock = clock;
        this.userRepository = userRepository;
        this.healthRecordRepository = healthRecordRepository;
        this.doseRepository = doseRepository;
        this.treatmentRepository = treatmentRepository;
        this.mealRepository = mealRepository;
        this.weightRepository = weightRepository;
        this.wellbeingRepository = wellbeingRepository;
        this.taskRepository = taskRepository;
    }

    /**
     * from y to son días en la hora local del hogar, ambos incluidos. types: lista separada por comas.
     */
    public List<TimelineItem> timeline(Long petId, Long userId, LocalDate from, LocalDate to, String typesParam) {
        Pet pet = petService.getById(petId, userId);
        Set<TimelineType> types = EnumParams.parseList(TimelineType.class, typesParam, "types");

        if (from != null && to != null && from.isAfter(to)) {
            throw new BadRequestException("La fecha 'from' no puede ser posterior a 'to'");
        }
        LocalDateTime start = from != null ? from.atStartOfDay() : MIN_DATE;
        LocalDateTime end = to != null ? to.atTime(23, 59, 59) : MAX_DATE;
        LocalDateTime now = clock.now(pet.getHouseholdId());
        RecordStatus active = RecordStatus.ACTIVE;

        List<Entry> entries = new ArrayList<>();
        if (types.contains(TimelineType.HEALTH)) {
            healthRecordRepository.findByPetIdAndStatusAndOccurredAtBetween(petId, active, start, end)
                    .forEach(r -> entries.add(health(r)));
        }
        if (types.contains(TimelineType.VACCINE) || types.contains(TimelineType.DEWORMING)) {
            doseRepository.findByPetIdAndStatusAndOccurredAtBetween(petId, active, start, end).stream()
                    .map(TimelineService::dose)
                    .filter(e -> types.contains(e.type()))
                    .forEach(entries::add);
        }
        if (types.contains(TimelineType.TREATMENT)) {
            treatmentRepository.findByPetIdAndStatusAndOccurredAtBetween(petId, active, start, end)
                    .forEach(r -> entries.add(treatment(r)));
        }
        if (types.contains(TimelineType.MEAL)) {
            mealRepository.findByPetIdAndStatusAndOccurredAtBetween(petId, active, start, end)
                    .forEach(r -> entries.add(meal(r)));
        }
        if (types.contains(TimelineType.WEIGHT)) {
            weightRepository.findByPetIdAndStatusAndOccurredAtBetween(petId, active, start, end)
                    .forEach(r -> entries.add(weight(r)));
        }
        if (types.contains(TimelineType.WELLBEING)) {
            wellbeingRepository.findByPetIdAndStatusAndOccurredAtBetween(petId, active, start, end)
                    .forEach(r -> entries.add(wellbeing(r)));
        }
        if (types.contains(TimelineType.TASK)) {
            taskRepository.findByPetIdAndDueAtBetween(petId, start, end)
                    .forEach(t -> entries.add(task(t, now)));
        }

        entries.sort(NEWEST_FIRST);
        return toItems(entries, Map.of(pet.getId(), pet.getName()), false);
    }

    /**
     * Últimos registros creados en el hogar (el llamador ya validó la pertenencia).
     */
    public List<TimelineItem> recentActivity(Long householdId, Map<Long, String> petNames, int limit) {
        Collection<Long> petIds = petNames.keySet();
        if (petIds.isEmpty()) {
            return List.of();
        }
        LocalDateTime now = clock.now(householdId);
        RecordStatus active = RecordStatus.ACTIVE;

        List<Entry> entries = Stream.of(
                        healthRecordRepository.findTop10ByPetIdInAndStatusOrderByCreatedAtDesc(petIds, active)
                                .stream().map(TimelineService::health),
                        doseRepository.findTop10ByPetIdInAndStatusOrderByCreatedAtDesc(petIds, active)
                                .stream().map(TimelineService::dose),
                        treatmentRepository.findTop10ByPetIdInAndStatusOrderByCreatedAtDesc(petIds, active)
                                .stream().map(TimelineService::treatment),
                        mealRepository.findTop10ByPetIdInAndStatusOrderByCreatedAtDesc(petIds, active)
                                .stream().map(TimelineService::meal),
                        weightRepository.findTop10ByPetIdInAndStatusOrderByCreatedAtDesc(petIds, active)
                                .stream().map(TimelineService::weight),
                        wellbeingRepository.findTop10ByPetIdInAndStatusOrderByCreatedAtDesc(petIds, active)
                                .stream().map(TimelineService::wellbeing),
                        taskRepository.findTop10ByPetIdInOrderByCreatedAtDesc(petIds)
                                .stream().map(t -> task(t, now)))
                .flatMap(Function.identity())
                .filter(e -> e.createdAt() != null)
                .sorted(Comparator.comparing(Entry::createdAt).reversed()
                        .thenComparing(Entry::id, Comparator.reverseOrder()))
                .limit(limit)
                .toList();

        return toItems(entries, petNames, true);
    }

    // ---------- Conversión de cada tipo ----------

    private static Entry health(HealthRecord r) {
        String summary = join(healthTypeLabel(r), r.getVeterinarian() != null ? "Veterinario: " + r.getVeterinarian() : null,
                shorten(r.getDescription()));
        return new Entry(TimelineType.HEALTH, r.getId(), r.getPetId(), r.getOccurredAt(), r.getCreatedAt(),
                r.getTitle(), summary, r.getCreatedBy());
    }

    private static Entry dose(PreventiveDose r) {
        boolean vaccine = r.getKind() == DoseKind.VACCINE;
        String summary = join(r.getNextDueOn() != null ? "Próxima dosis: " + r.getNextDueOn() : null, shorten(r.getNotes()));
        return new Entry(vaccine ? TimelineType.VACCINE : TimelineType.DEWORMING, r.getId(), r.getPetId(),
                r.getOccurredAt(), r.getCreatedAt(),
                (vaccine ? "Vacuna: " : "Desparasitación: ") + r.getProductName(), summary, r.getCreatedBy());
    }

    private static Entry treatment(Treatment r) {
        String summary = join(r.getDosage(), r.getFrequency(), r.getEndsOn() != null ? "Hasta " + r.getEndsOn() : null);
        return new Entry(TimelineType.TREATMENT, r.getId(), r.getPetId(), r.getOccurredAt(), r.getCreatedAt(),
                "Tratamiento: " + r.getMedication(), summary, r.getCreatedBy());
    }

    private static Entry meal(Meal r) {
        return new Entry(TimelineType.MEAL, r.getId(), r.getPetId(), r.getOccurredAt(), r.getCreatedAt(),
                "Comida: " + r.getFood(), join(r.getQuantity(), shorten(r.getNotes())), r.getCreatedBy());
    }

    private static Entry weight(WeightRecord r) {
        return new Entry(TimelineType.WEIGHT, r.getId(), r.getPetId(), r.getOccurredAt(), r.getCreatedAt(),
                "Peso: " + r.getWeightKg().stripTrailingZeros().toPlainString() + " kg", shorten(r.getNotes()),
                r.getCreatedBy());
    }

    private static Entry wellbeing(WellbeingLog r) {
        String summary = join(r.getEnergy() != null ? "Energía: " + levelLabel(r.getEnergy().name()) : null,
                r.getAppetite() != null ? "Apetito: " + levelLabel(r.getAppetite().name()) : null,
                shorten(r.getNotes()));
        return new Entry(TimelineType.WELLBEING, r.getId(), r.getPetId(), r.getOccurredAt(), r.getCreatedAt(),
                "Bienestar: ánimo " + moodLabel(r.getMood().name()), summary, r.getCreatedBy());
    }

    private static Entry task(CareTask t, LocalDateTime now) {
        String status = switch (t.getStatus()) {
            case PENDING -> t.isOverdueAt(now) ? "Vencida" : "Pendiente";
            case COMPLETED -> "Completada";
            case CANCELLED -> "Cancelada";
        };
        return new Entry(TimelineType.TASK, t.getId(), t.getPetId(), t.getDueAt(), t.getCreatedAt(),
                t.getTitle(), join(taskTypeLabel(t), status, t.getLocation()), t.getCreatedBy());
    }

    // ---------- Apoyo ----------

    private List<TimelineItem> toItems(List<Entry> entries, Map<Long, String> petNames, boolean useCreatedAt) {
        Map<Long, String> userNames = userRepository
                .findAllById(entries.stream().map(Entry::createdById).filter(Objects::nonNull).distinct().toList())
                .stream()
                .collect(Collectors.toMap(User::getId, User::getFullName));

        return entries.stream()
                .map(e -> new TimelineItem(e.type(), e.id(), e.petId(), petNames.get(e.petId()),
                        useCreatedAt ? e.createdAt() : e.date(), e.title(), e.summary(),
                        userNames.get(e.createdById())))
                .toList();
    }

    private static String join(String... parts) {
        String joined = Stream.of(parts)
                .filter(p -> p != null && !p.isBlank())
                .collect(Collectors.joining(" · "));
        return joined.isEmpty() ? null : joined;
    }

    private static String shorten(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        String clean = text.strip();
        return clean.length() <= 140 ? clean : clean.substring(0, 137) + "...";
    }

    private static String healthTypeLabel(HealthRecord r) {
        return switch (r.getRecordType()) {
            case CONSULTATION -> "Consulta";
            case DIAGNOSIS -> "Diagnóstico";
            case EXAM -> "Examen";
            case SURGERY -> "Cirugía";
            case ALLERGY -> "Alergia";
            case OTHER -> "Otro";
        };
    }

    private static String taskTypeLabel(CareTask t) {
        return switch (t.getType()) {
            case VET_APPOINTMENT -> "Cita veterinaria";
            case VACCINE -> "Vacuna";
            case DEWORMING -> "Desparasitación";
            case MEDICATION -> "Medicamento";
            case GROOMING -> "Peluquería";
            case PURCHASE -> "Compra";
            case OTHER -> "Otra";
        };
    }

    private static String moodLabel(String mood) {
        return switch (mood) {
            case "VERY_BAD" -> "muy malo";
            case "BAD" -> "malo";
            case "GOOD" -> "bueno";
            case "VERY_GOOD" -> "muy bueno";
            default -> "normal";
        };
    }

    private static String levelLabel(String level) {
        return switch (level) {
            case "LOW" -> "baja";
            case "HIGH" -> "alta";
            default -> "normal";
        };
    }

    private record Entry(TimelineType type, Long id, Long petId, LocalDateTime date, LocalDateTime createdAt,
                         String title, String summary, Long createdById) {
    }
}
