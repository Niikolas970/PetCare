package com.petcare.backend.records;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;

import com.petcare.backend.common.CurrentUser;
import com.petcare.backend.records.RecordRequests.CreateDose;
import com.petcare.backend.records.RecordRequests.CreateHealthRecord;
import com.petcare.backend.records.RecordRequests.CreateMeal;
import com.petcare.backend.records.RecordRequests.CreateTreatment;
import com.petcare.backend.records.RecordRequests.CreateWeight;
import com.petcare.backend.records.RecordRequests.CreateWellbeing;
import com.petcare.backend.records.RecordRequests.DoseCreated;
import com.petcare.backend.records.RecordRequests.DoseVoided;
import com.petcare.backend.records.RecordRequests.VoidRecord;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Registros de la mascota. Los listados devuelven solo ACTIVE salvo ?includeVoided=true.
 * PATCH .../{id}/void anula sin borrar (solo OWNER; cuerpo opcional {reason}).
 */
@RestController
@Tag(name = "Historial y registros", description = "Salud, vacunas, tratamientos, comidas, pesos y bienestar (sin borrado físico)")
@RequestMapping("/api/pets/{petId}")
public class PetRecordController {

    private static final String VOID_DESCRIPTION =
            "Solo OWNER (403 para CAREGIVER). No borra: deja status VOIDED con voidedBy, voidedAt y voidReason. "
                    + "409 si ya estaba anulado o la mascota está archivada.";

    private final PetRecordService recordService;
    private final CurrentUser currentUser;

    public PetRecordController(PetRecordService recordService, CurrentUser currentUser) {
        this.recordService = recordService;
        this.currentUser = currentUser;
    }

    // ---------- Salud ----------

    @Operation(summary = "Listar registros de salud", description = "?includeVoided=true incluye los anulados.")
    @GetMapping("/health-records")
    public List<HealthRecord> listHealthRecords(@PathVariable Long petId,
                                                @RequestParam(defaultValue = "false") boolean includeVoided) {
        return recordService.listHealthRecords(petId, currentUser.id(), includeVoided);
    }

    @Operation(summary = "Registrar evento de salud", description = "Consulta, diagnóstico, examen, cirugía o alergia.")
    @PostMapping("/health-records")
    @ResponseStatus(HttpStatus.CREATED)
    public HealthRecord createHealthRecord(@PathVariable Long petId, @Valid @RequestBody CreateHealthRecord request) {
        return recordService.createHealthRecord(petId, currentUser.id(), request);
    }

    @Operation(summary = "Anular registro de salud", description = VOID_DESCRIPTION)
    @PatchMapping("/health-records/{id}/void")
    public HealthRecord voidHealthRecord(@PathVariable Long petId, @PathVariable Long id,
                                         @Valid @RequestBody(required = false) VoidRecord request) {
        return recordService.voidHealthRecord(petId, id, currentUser.id(), request);
    }

    // ---------- Vacunas y desparasitaciones ----------

    @Operation(summary = "Listar vacunas y desparasitaciones", description = "?includeVoided=true incluye los anulados.")
    @GetMapping("/doses")
    public List<PreventiveDose> listDoses(@PathVariable Long petId,
                                          @RequestParam(defaultValue = "false") boolean includeVoided) {
        return recordService.listDoses(petId, currentUser.id(), includeVoided);
    }

    @Operation(summary = "Registrar vacuna o desparasitación", description = "Si incluye nextDueOn se crea una tarea PENDING para esa fecha.")
    @PostMapping("/doses")
    @ResponseStatus(HttpStatus.CREATED)
    public DoseCreated createDose(@PathVariable Long petId, @Valid @RequestBody CreateDose request) {
        return recordService.createDose(petId, currentUser.id(), request);
    }

    @Operation(summary = "Anular vacuna o desparasitación", description = VOID_DESCRIPTION
            + " Su tarea de próxima dosis, si sigue PENDING, pasa a CANCELLED (cancelledTaskIds).")
    @PatchMapping("/doses/{id}/void")
    public DoseVoided voidDose(@PathVariable Long petId, @PathVariable Long id,
                               @Valid @RequestBody(required = false) VoidRecord request) {
        return recordService.voidDose(petId, id, currentUser.id(), request);
    }

    // ---------- Tratamientos ----------

    @Operation(summary = "Listar tratamientos", description = "?includeVoided=true incluye los anulados.")
    @GetMapping("/treatments")
    public List<Treatment> listTreatments(@PathVariable Long petId,
                                          @RequestParam(defaultValue = "false") boolean includeVoided) {
        return recordService.listTreatments(petId, currentUser.id(), includeVoided);
    }

    @Operation(summary = "Registrar tratamiento")
    @PostMapping("/treatments")
    @ResponseStatus(HttpStatus.CREATED)
    public Treatment createTreatment(@PathVariable Long petId, @Valid @RequestBody CreateTreatment request) {
        return recordService.createTreatment(petId, currentUser.id(), request);
    }

    @Operation(summary = "Anular tratamiento", description = VOID_DESCRIPTION)
    @PatchMapping("/treatments/{id}/void")
    public Treatment voidTreatment(@PathVariable Long petId, @PathVariable Long id,
                                   @Valid @RequestBody(required = false) VoidRecord request) {
        return recordService.voidTreatment(petId, id, currentUser.id(), request);
    }

    // ---------- Comidas ----------

    @Operation(summary = "Listar comidas", description = "?includeVoided=true incluye las anuladas.")
    @GetMapping("/meals")
    public List<Meal> listMeals(@PathVariable Long petId,
                                @RequestParam(defaultValue = "false") boolean includeVoided) {
        return recordService.listMeals(petId, currentUser.id(), includeVoided);
    }

    @Operation(summary = "Registrar comida")
    @PostMapping("/meals")
    @ResponseStatus(HttpStatus.CREATED)
    public Meal createMeal(@PathVariable Long petId, @Valid @RequestBody CreateMeal request) {
        return recordService.createMeal(petId, currentUser.id(), request);
    }

    @Operation(summary = "Anular comida", description = VOID_DESCRIPTION)
    @PatchMapping("/meals/{id}/void")
    public Meal voidMeal(@PathVariable Long petId, @PathVariable Long id,
                         @Valid @RequestBody(required = false) VoidRecord request) {
        return recordService.voidMeal(petId, id, currentUser.id(), request);
    }

    // ---------- Pesos ----------

    @Operation(summary = "Listar pesos", description = "?includeVoided=true incluye los anulados.")
    @GetMapping("/weights")
    public List<WeightRecord> listWeights(@PathVariable Long petId,
                                          @RequestParam(defaultValue = "false") boolean includeVoided) {
        return recordService.listWeights(petId, currentUser.id(), includeVoided);
    }

    @Operation(summary = "Registrar peso", description = "Actualiza el peso actual de la mascota con la medición más reciente.")
    @PostMapping("/weights")
    @ResponseStatus(HttpStatus.CREATED)
    public WeightRecord createWeight(@PathVariable Long petId, @Valid @RequestBody CreateWeight request) {
        return recordService.createWeight(petId, currentUser.id(), request);
    }

    @Operation(summary = "Anular peso", description = VOID_DESCRIPTION
            + " El peso actual pasa a la medición ACTIVE más reciente.")
    @PatchMapping("/weights/{id}/void")
    public WeightRecord voidWeight(@PathVariable Long petId, @PathVariable Long id,
                                   @Valid @RequestBody(required = false) VoidRecord request) {
        return recordService.voidWeight(petId, id, currentUser.id(), request);
    }

    // ---------- Bienestar ----------

    @Operation(summary = "Listar registros de bienestar", description = "?includeVoided=true incluye los anulados.")
    @GetMapping("/wellbeing")
    public List<WellbeingLog> listWellbeing(@PathVariable Long petId,
                                            @RequestParam(defaultValue = "false") boolean includeVoided) {
        return recordService.listWellbeing(petId, currentUser.id(), includeVoided);
    }

    @Operation(summary = "Registrar bienestar", description = "Ánimo, energía y apetito.")
    @PostMapping("/wellbeing")
    @ResponseStatus(HttpStatus.CREATED)
    public WellbeingLog createWellbeing(@PathVariable Long petId, @Valid @RequestBody CreateWellbeing request) {
        return recordService.createWellbeing(petId, currentUser.id(), request);
    }

    @Operation(summary = "Anular registro de bienestar", description = VOID_DESCRIPTION)
    @PatchMapping("/wellbeing/{id}/void")
    public WellbeingLog voidWellbeing(@PathVariable Long petId, @PathVariable Long id,
                                      @Valid @RequestBody(required = false) VoidRecord request) {
        return recordService.voidWellbeing(petId, id, currentUser.id(), request);
    }
}
