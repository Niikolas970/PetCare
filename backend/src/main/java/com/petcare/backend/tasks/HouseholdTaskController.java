package com.petcare.backend.tasks;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;

import com.petcare.backend.common.CurrentUser;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Tareas del hogar", description = "Tareas de todas las mascotas activas del hogar")
@RequestMapping("/api/households/{householdId}/tasks")
public class HouseholdTaskController {

    private final CareTaskService taskService;
    private final CurrentUser currentUser;

    public HouseholdTaskController(CareTaskService taskService, CurrentUser currentUser) {
        this.taskService = taskService;
        this.currentUser = currentUser;
    }

    // range = upcoming (por defecto) | overdue | all; days solo aplica a upcoming
    @Operation(summary = "Listar tareas del hogar", description = "range=upcoming (por defecto, próximos ?days=7 días), overdue o all.")
    @GetMapping
    public List<CareTaskResponse> list(@PathVariable Long householdId,
                                       @RequestParam(required = false) String range,
                                       @RequestParam(required = false) Integer days) {
        return taskService.listForHousehold(householdId, currentUser.id(), range, days);
    }
}
