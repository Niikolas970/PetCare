package com.petcare.backend.records;

import java.time.LocalDateTime;
import java.util.List;

import com.petcare.backend.common.BadRequestException;
import com.petcare.backend.common.BusinessRuleException;
import com.petcare.backend.common.ResourceNotFoundException;
import com.petcare.backend.households.HouseholdAccessService;
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
import com.petcare.backend.records.RecordRequests.VoidRecord;
import com.petcare.backend.tasks.CareTask;
import com.petcare.backend.tasks.CareTaskService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Historial clínico y registros diarios. Crear: OWNER y CAREGIVER. Anular: solo OWNER.
 * No hay borrado físico: los registros se anulan con status VOIDED, guardando quién, cuándo y por qué.
 */
@Service
public class PetRecordService {

    static final String RECORD_NOT_FOUND = "El registro no existe";
    static final String ALREADY_VOIDED = "El registro ya está anulado";

    private final PetService petService;
    private final HouseholdAccessService accessService;
    private final HouseholdClock clock;
    private final CareTaskService careTaskService;
    private final HealthRecordRepository healthRecordRepository;
    private final PreventiveDoseRepository doseRepository;
    private final TreatmentRepository treatmentRepository;
    private final MealRepository mealRepository;
    private final WeightRecordRepository weightRepository;
    private final WellbeingLogRepository wellbeingRepository;

    public PetRecordService(PetService petService, HouseholdAccessService accessService, HouseholdClock clock,
                            CareTaskService careTaskService,
                            HealthRecordRepository healthRecordRepository,
                            PreventiveDoseRepository doseRepository,
                            TreatmentRepository treatmentRepository,
                            MealRepository mealRepository,
                            WeightRecordRepository weightRepository,
                            WellbeingLogRepository wellbeingRepository) {
        this.petService = petService;
        this.accessService = accessService;
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
    public List<HealthRecord> listHealthRecords(Long petId, Long userId, boolean includeVoided) {
        return list(healthRecordRepository, petId, userId, includeVoided);
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

    @Transactional
    public HealthRecord voidHealthRecord(Long petId, Long recordId, Long userId, VoidRecord request) {
        return voidRecord(healthRecordRepository, petId, recordId, userId, request);
    }

    // ---------- Vacunas y desparasitaciones ----------

    @Transactional(readOnly = true)
    public List<PreventiveDose> listDoses(Long petId, Long userId, boolean includeVoided) {
        return list(doseRepository, petId, userId, includeVoided);
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

    @Transactional
    public PreventiveDose voidDose(Long petId, Long recordId, Long userId, VoidRecord request) {
        return voidRecord(doseRepository, petId, recordId, userId, request);
    }

    // ---------- Tratamientos ----------

    @Transactional(readOnly = true)
    public List<Treatment> listTreatments(Long petId, Long userId, boolean includeVoided) {
        return list(treatmentRepository, petId, userId, includeVoided);
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

    @Transactional
    public Treatment voidTreatment(Long petId, Long recordId, Long userId, VoidRecord request) {
        return voidRecord(treatmentRepository, petId, recordId, userId, request);
    }

    // ---------- Comidas ----------

    @Transactional(readOnly = true)
    public List<Meal> listMeals(Long petId, Long userId, boolean includeVoided) {
        return list(mealRepository, petId, userId, includeVoided);
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

    @Transactional
    public Meal voidMeal(Long petId, Long recordId, Long userId, VoidRecord request) {
        return voidRecord(mealRepository, petId, recordId, userId, request);
    }

    // ---------- Pesos ----------

    @Transactional(readOnly = true)
    public List<WeightRecord> listWeights(Long petId, Long userId, boolean includeVoided) {
        return list(weightRepository, petId, userId, includeVoided);
    }

    @Transactional
    public WeightRecord createWeight(Long petId, Long userId, CreateWeight request) {
        Pet pet = petService.requireWritable(petId, userId);
        WeightRecord weight = new WeightRecord();
        weight.setWeightKg(request.weightKg());
        weight.setNotes(request.notes());
        weight = save(weightRepository, pet, userId, request.occurredAt(), weight);
        refreshCurrentWeight(pet);
        return weight;
    }

    @Transactional
    public WeightRecord voidWeight(Long petId, Long recordId, Long userId, VoidRecord request) {
        WeightRecord voided = voidRecord(weightRepository, petId, recordId, userId, request);
        refreshCurrentWeight(petService.getById(petId, userId));
        return voided;
    }

    // pets.weight_kg refleja siempre la medición ACTIVE más reciente (si no queda ninguna, no se toca)
    private void refreshCurrentWeight(Pet pet) {
        weightRepository.findFirstByPetIdAndStatusOrderByOccurredAtDescIdDesc(pet.getId(), RecordStatus.ACTIVE)
                .ifPresent(latest -> petService.updateCurrentWeight(pet, latest.getWeightKg()));
    }

    // ---------- Bienestar ----------

    @Transactional(readOnly = true)
    public List<WellbeingLog> listWellbeing(Long petId, Long userId, boolean includeVoided) {
        return list(wellbeingRepository, petId, userId, includeVoided);
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

    @Transactional
    public WellbeingLog voidWellbeing(Long petId, Long recordId, Long userId, VoidRecord request) {
        return voidRecord(wellbeingRepository, petId, recordId, userId, request);
    }

    // ---------- Internos ----------

    private <T extends PetRecord> List<T> list(PetRecordRepository<T> repository, Long petId, Long userId,
                                               boolean includeVoided) {
        petService.getById(petId, userId);
        return includeVoided
                ? repository.findByPetIdOrderByOccurredAtDesc(petId)
                : repository.findByPetIdAndStatusOrderByOccurredAtDesc(petId, RecordStatus.ACTIVE);
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

    /**
     * Anula sin borrar: 404 si el registro no es de esa mascota, 403 si no es OWNER,
     * 409 si la mascota está archivada o el registro ya estaba anulado.
     */
    private <T extends PetRecord> T voidRecord(PetRecordRepository<T> repository, Long petId, Long recordId,
                                               Long userId, VoidRecord request) {
        Pet pet = petService.getById(petId, userId);
        T record = repository.findById(recordId)
                .filter(r -> r.getPetId().equals(petId))
                .orElseThrow(() -> new ResourceNotFoundException(RECORD_NOT_FOUND));
        accessService.requireOwner(pet.getHouseholdId(), userId);
        petService.requireWritable(petId, userId);
        if (record.getStatus() == RecordStatus.VOIDED) {
            throw new BusinessRuleException(ALREADY_VOIDED);
        }

        String reason = request == null || request.reason() == null || request.reason().isBlank()
                ? null : request.reason().trim();
        record.setStatus(RecordStatus.VOIDED);
        record.setVoidedBy(userId);
        record.setVoidedAt(clock.now(pet.getHouseholdId()));
        record.setVoidReason(reason);
        return repository.save(record);
    }
}
