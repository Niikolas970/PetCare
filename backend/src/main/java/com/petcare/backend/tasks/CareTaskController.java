package com.petcare.backend.tasks;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.net.URI;
import java.util.List;

import com.petcare.backend.common.CurrentUser;
import com.petcare.backend.tasks.CareTaskRequests.CompleteCareTask;
import com.petcare.backend.tasks.CareTaskRequests.RescheduleCareTask;
import com.petcare.backend.tasks.CareTaskRequests.SaveCareTask;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Tareas de cuidado", description = "Citas y recordatorios de una mascota. overdue se calcula con la hora del hogar.")
@RequestMapping("/api/pets/{petId}/tasks")
public class CareTaskController {

    private final CareTaskService taskService;
    private final CurrentUser currentUser;

    public CareTaskController(CareTaskService taskService, CurrentUser currentUser) {
        this.taskService = taskService;
        this.currentUser = currentUser;
    }

    @Operation(summary = "Listar tareas de la mascota", description = "Filtro opcional ?status=PENDING|COMPLETED|CANCELLED.")
    @GetMapping
    public List<CareTaskResponse> list(@PathVariable Long petId, @RequestParam(required = false) String status) {
        return taskService.listForPet(petId, currentUser.id(), status);
    }

    @Operation(summary = "Crear tarea")
    @PostMapping
    public ResponseEntity<CareTaskResponse> create(@PathVariable Long petId,
                                                   @Valid @RequestBody SaveCareTask request) {
        CareTaskResponse saved = taskService.create(petId, currentUser.id(), request);
        return ResponseEntity
                .created(URI.create("/api/pets/" + petId + "/tasks/" + saved.id()))
                .body(saved);
    }

    @Operation(summary = "Editar tarea", description = "Solo tareas PENDING (409 si no).")
    @PutMapping("/{id}")
    public CareTaskResponse update(@PathVariable Long petId, @PathVariable Long id,
                                   @Valid @RequestBody SaveCareTask request) {
        return taskService.update(petId, id, currentUser.id(), request);
    }

    // El cuerpo es opcional: sin él se completa con la hora actual del hogar
    @Operation(summary = "Completar tarea", description = "Solo PENDING. completedAt y notes son opcionales.")
    @PatchMapping("/{id}/complete")
    public CareTaskResponse complete(@PathVariable Long petId, @PathVariable Long id,
                                     @Valid @RequestBody(required = false) CompleteCareTask request) {
        return taskService.complete(petId, id, currentUser.id(), request);
    }

    @Operation(summary = "Cancelar tarea", description = "Solo PENDING.")
    @PatchMapping("/{id}/cancel")
    public CareTaskResponse cancel(@PathVariable Long petId, @PathVariable Long id) {
        return taskService.cancel(petId, id, currentUser.id());
    }

    @Operation(summary = "Reprogramar tarea", description = "Solo PENDING.")
    @PatchMapping("/{id}/reschedule")
    public CareTaskResponse reschedule(@PathVariable Long petId, @PathVariable Long id,
                                       @Valid @RequestBody RescheduleCareTask request) {
        return taskService.reschedule(petId, id, currentUser.id(), request);
    }
}
