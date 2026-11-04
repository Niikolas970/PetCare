package com.petcare.backend.records;

import java.time.LocalDateTime;
import java.util.List;

import com.petcare.backend.common.BadRequestException;
import com.petcare.backend.households.HouseholdClock;
import com.petcare.backend.pets.Pet;
import com.petcare.backend.pets.PetService;
import com.petcare.backend.records.RecordRequests.CreateDose;
import com.petcare.backend.records.RecordRequests.CreateHealthRecord;
import com.petcare.backend.records.RecordRequests.CreateMeal;
import com.petcare.backend.records.RecordRequests.CreateTreatment;
import com.petcare.backend.records.RecordRequests.CreateWeight;
import com.petcare.backend.records.RecordRequests.CreateWellbeing;
import com.petcare.backend.records.RecordRequests.DoseCreated;
import com.petcare.backend.tasks.CareTask;
import com.petcare.backend.tasks.CareTaskService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Historial clínico y registros diarios. Crear: OWNER y CAREGIVER.
 * No hay borrado físico (los registros se anulan con status VOIDED).
 */
@Service
public class PetRecordService {

    private final PetService petService;
    private final HouseholdClock clock;
    private final CareTaskService careTaskService;
    private final HealthRecordRepository healthRecordRepository;
    private final PreventiveDoseRepository doseRepository;
    private final TreatmentRepository treatmentRepository;
    private final MealRepository mealRepository;
    private final WeightRecordRepository weightRepository;
    private final WellbeingLogRepository wellbeingRepository;

    public PetRecordService(PetService petService, HouseholdClock clock, CareTaskService careTaskService,
                            HealthRecordRepository healthRecordRepository,
                            PreventiveDoseRepository doseRepository,
                            TreatmentRepository treatmentRepository,
                            MealRepository mealRepository,
                            WeightRecordRepository weightRepository,
                            WellbeingLogRepository wellbeingRepository) {
        this.petService = petService;
        this.clock = clock;
        this.careTaskService = careTaskService;
        this.healthRecordRepository = healthRecordRepository;
        this.doseRepository = doseRepository;
        this.treatmentRepository = treatmentRepository;
        this.mealRepository = mealRepository;
        this.weightRepository = weightRepository;
        this.wellbeingRepository = wellbeingRepository;
    }

    // ---------- Registros de salud ----------

    @Transactional(readOnly = true)
    public List<HealthRecord> listHealthRecords(Long petId, Long userId) {
        return list(healthRecordRepository, petId, userId);
    }

    @Transactional
    public HealthRecord createHealthRecord(Long petId, Long userId, CreateHealthRecord request) {
        Pet pet = petService.requireWritable(petId, userId);
        HealthRecord record = new HealthRecord();
        record.setRecordType(request.recordType());
        record.setTitle(request.title().trim());
        record.setDescription(request.description());
        record.setVeterinarian(request.veterinarian());
        return save(healthRecordRepository, pet, userId, request.occurredAt(), record);
    }

    // ---------- Vacunas y desparasitaciones ----------

    @Transactional(readOnly = true)
    public List<PreventiveDose> listDoses(Long petId, Long userId) {
        return list(doseRepository, petId, userId);
    }

    @Transactional
    public DoseCreated createDose(Long petId, Long userId, CreateDose request) {
        Pet pet = petService.requireWritable(petId, userId);
        PreventiveDose dose = new PreventiveDose();
        dose.setKind(request.kind());
        dose.setProductName(request.productName().trim());
        dose.setNextDueOn(request.nextDueOn());
        dose.setNotes(request.notes());
        dose = save(doseRepository, pet, userId, request.occurredAt(), dose);

        if (dose.getNextDueOn() != null && !dose.getNextDueOn().isAfter(dose.getOccurredAt().toLocalDate())) {
            throw new BadRequestException("La próxima dosis debe ser posterior a la fecha de aplicación");
        }

        Long taskId = null;
        if (dose.getNextDueOn() != null) {
            CareTask task = careTaskService.createForDose(pet, dose, userId);
            taskId = task.getId();
        }
        return new DoseCreated(dose, taskId);
    }

    // ---------- Tratamientos ----------

    @Transactional(readOnly = true)
    public List<Treatment> listTreatments(Long petId, Long userId) {
        return list(treatmentRepository, petId, userId);
    }

    @Transactional
    public Treatment createTreatment(Long petId, Long userId, CreateTreatment request) {
        Pet pet = petService.requireWritable(petId, userId);
        Treatment treatment = new Treatment();
        treatment.setMedication(request.medication().trim());
        treatment.setDosage(request.dosage());
        treatment.setFrequency(request.frequency());
        treatment.setEndsOn(request.endsOn());
        treatment.setNotes(request.notes());
        treatment = save(treatmentRepository, pet, userId, request.occurredAt(), treatment);

        if (treatment.getEndsOn() != null && treatment.getEndsOn().isBefore(treatment.getOccurredAt().toLocalDate())) {
            throw new BadRequestException("La fecha de fin no puede ser anterior al inicio del tratamiento");
        }
        return treatment;
    }

    // ---------- Comidas ----------

    @Transactional(readOnly = true)
    public List<Meal> listMeals(Long petId, Long userId) {
        return list(mealRepository, petId, userId);
    }

    @Transactional
    public Meal createMeal(Long petId, Long userId, CreateMeal request) {
        Pet pet = petService.requireWritable(petId, userId);
        Meal meal = new Meal();
        meal.setFood(request.food().trim());
        meal.setQuantity(request.quantity());
        meal.setNotes(request.notes());
        return save(mealRepository, pet, userId, request.occurredAt(), meal);
    }

    // ---------- Pesos ----------

    @Transactional(readOnly = true)
    public List<WeightRecord> listWeights(Long petId, Long userId) {
        return list(weightRepository, petId, userId);
    }

    @Transactional
    public WeightRecord createWeight(Long petId, Long userId, CreateWeight request) {
        Pet pet = petService.requireWritable(petId, userId);
        WeightRecord weight = new WeightRecord();
        weight.setWeightKg(request.weightKg());
        weight.setNotes(request.notes());
        weight = save(weightRepository, pet, userId, request.occurredAt(), weight);

        // pets.weight_kg refleja siempre la medición más reciente
        weightRepository.findFirstByPetIdAndStatusOrderByOccurredAtDescIdDesc(pet.getId(), RecordStatus.ACTIVE)
                .ifPresent(latest -> petService.updateCurrentWeight(pet, latest.getWeightKg()));
        return weight;
    }

    // ---------- Bienestar ----------

    @Transactional(readOnly = true)
    public List<WellbeingLog> listWellbeing(Long petId, Long userId) {
        return list(wellbeingRepository, petId, userId);
    }

    @Transactional
    public WellbeingLog createWellbeing(Long petId, Long userId, CreateWellbeing request) {
        Pet pet = petService.requireWritable(petId, userId);
        WellbeingLog log = new WellbeingLog();
        log.setMood(request.mood());
        log.setEnergy(request.energy());
        log.setAppetite(request.appetite());
        log.setNotes(request.notes());
        return save(wellbeingRepository, pet, userId, request.occurredAt(), log);
    }

    // ---------- Internos ----------

    private <T extends PetRecord> List<T> list(PetRecordRepository<T> repository, Long petId, Long userId) {
        petService.getById(petId, userId);
        return repository.findByPetIdAndStatusOrderByOccurredAtDesc(petId, RecordStatus.ACTIVE);
    }

    private <T extends PetRecord> T save(PetRecordRepository<T> repository, Pet pet, Long userId,
                                         LocalDateTime occurredAt, T record) {
        LocalDateTime now = clock.now(pet.getHouseholdId());
        LocalDateTime when = occurredAt != null ? occurredAt : now;
        if (when.isAfter(now)) {
            throw new BadRequestException("La fecha del registro no puede ser futura");
        }

        record.setPetId(pet.getId());
        record.setOccurredAt(when);
        record.setStatus(RecordStatus.ACTIVE);
        record.setCreatedBy(userId);
        return repository.save(record);
    }
}
