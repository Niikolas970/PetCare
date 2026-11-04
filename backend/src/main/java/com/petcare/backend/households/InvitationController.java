package com.petcare.backend.households;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;

import com.petcare.backend.common.CurrentUser;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Invitaciones", description = "Invitaciones recibidas por el usuario")
@RequestMapping("/api/invitations")
public class InvitationController {

    private final InvitationService invitationService;
    private final CurrentUser currentUser;

    public InvitationController(InvitationService invitationService, CurrentUser currentUser) {
        this.invitationService = invitationService;
        this.currentUser = currentUser;
    }

    @Operation(summary = "Listar mis invitaciones pendientes", description = "Incluye el hogar y quién invitó.")
    @GetMapping
    public List<InvitationResponse> listMyInvitations() {
        return invitationService.listPending(currentUser.id());
    }

    @Operation(summary = "Aceptar invitación", description = "El usuario pasa a ser miembro ACTIVE del hogar.")
    @PostMapping("/{householdId}/accept")
    public HouseholdSummary accept(@PathVariable Long householdId) {
        return invitationService.accept(householdId, currentUser.id());
    }

    @Operation(summary = "Rechazar invitación", description = "Elimina la invitación pendiente.")
    @PostMapping("/{householdId}/decline")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void decline(@PathVariable Long householdId) {
        invitationService.decline(householdId, currentUser.id());
    }
}
