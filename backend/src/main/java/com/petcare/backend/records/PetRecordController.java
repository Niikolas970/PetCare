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

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Historial y registros", description = "Salud, vacunas, tratamientos, comidas, pesos y bienestar (sin borrado físico)")
@RequestMapping("/api/pets/{petId}")
public class PetRecordController {

    private final PetRecordService recordService;
    private final CurrentUser currentUser;

    public PetRecordController(PetRecordService recordService, CurrentUser currentUser) {
        this.recordService = recordService;
        this.currentUser = currentUser;
    }

    @Operation(summary = "Listar registros de salud")
    @GetMapping("/health-records")
    public List<HealthRecord> listHealthRecords(@PathVariable Long petId) {
        return recordService.listHealthRecords(petId, currentUser.id());
    }

    @Operation(summary = "Registrar evento de salud", description = "Consulta, diagnóstico, examen, cirugía o alergia.")
    @PostMapping("/health-records")
    @ResponseStatus(HttpStatus.CREATED)
    public HealthRecord createHealthRecord(@PathVariable Long petId, @Valid @RequestBody CreateHealthRecord request) {
        return recordService.createHealthRecord(petId, currentUser.id(), request);
    }

    @Operation(summary = "Listar vacunas y desparasitaciones")
    @GetMapping("/doses")
    public List<PreventiveDose> listDoses(@PathVariable Long petId) {
        return recordService.listDoses(petId, currentUser.id());
    }

    @Operation(summary = "Registrar vacuna o desparasitación", description = "Si incluye nextDueOn se crea una tarea PENDING para esa fecha.")
    @PostMapping("/doses")
    @ResponseStatus(HttpStatus.CREATED)
    public DoseCreated createDose(@PathVariable Long petId, @Valid @RequestBody CreateDose request) {
        return recordService.createDose(petId, currentUser.id(), request);
    }

    @Operation(summary = "Listar tratamientos")
    @GetMapping("/treatments")
    public List<Treatment> listTreatments(@PathVariable Long petId) {
        return recordService.listTreatments(petId, currentUser.id());
    }

    @Operation(summary = "Registrar tratamiento")
    @PostMapping("/treatments")
    @ResponseStatus(HttpStatus.CREATED)
    public Treatment createTreatment(@PathVariable Long petId, @Valid @RequestBody CreateTreatment request) {
        return recordService.createTreatment(petId, currentUser.id(), request);
    }

    @Operation(summary = "Listar comidas")
    @GetMapping("/meals")
    public List<Meal> listMeals(@PathVariable Long petId) {
        return recordService.listMeals(petId, currentUser.id());
    }

    @Operation(summary = "Registrar comida")
    @PostMapping("/meals")
    @ResponseStatus(HttpStatus.CREATED)
    public Meal createMeal(@PathVariable Long petId, @Valid @RequestBody CreateMeal request) {
        return recordService.createMeal(petId, currentUser.id(), request);
    }

    @Operation(summary = "Listar pesos")
    @GetMapping("/weights")
    public List<WeightRecord> listWeights(@PathVariable Long petId) {
        return recordService.listWeights(petId, currentUser.id());
    }

    @Operation(summary = "Registrar peso", description = "Actualiza el peso actual de la mascota con la medición más reciente.")
    @PostMapping("/weights")
    @ResponseStatus(HttpStatus.CREATED)
    public WeightRecord createWeight(@PathVariable Long petId, @Valid @RequestBody CreateWeight request) {
        return recordService.createWeight(petId, currentUser.id(), request);
    }

    @Operation(summary = "Listar registros de bienestar")
    @GetMapping("/wellbeing")
    public List<WellbeingLog> listWellbeing(@PathVariable Long petId) {
        return recordService.listWellbeing(petId, currentUser.id());
    }

    @Operation(summary = "Registrar bienestar", description = "Ánimo, energía y apetito.")
    @PostMapping("/wellbeing")
    @ResponseStatus(HttpStatus.CREATED)
    public WellbeingLog createWellbeing(@PathVariable Long petId, @Valid @RequestBody CreateWellbeing request) {
        return recordService.createWellbeing(petId, currentUser.id(), request);
    }
}
