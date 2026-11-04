package com.petcare.backend.dashboard;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.petcare.backend.common.CurrentUser;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Panel del hogar", description = "Resumen del hogar")
public class DashboardController {

    private final DashboardService dashboardService;
    private final CurrentUser currentUser;

    public DashboardController(DashboardService dashboardService, CurrentUser currentUser) {
        this.dashboardService = dashboardService;
        this.currentUser = currentUser;
    }

    @Operation(summary = "Panel del hogar", description = "Mascotas activas, último peso, próxima tarea, tareas próximas y vencidas, y actividad reciente.")
    @GetMapping("/api/households/{householdId}/dashboard")
    public DashboardResponse dashboard(@PathVariable Long householdId) {
        return dashboardService.dashboard(householdId, currentUser.id());
    }
}
