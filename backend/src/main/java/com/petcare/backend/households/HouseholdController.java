package com.petcare.backend.households;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;

import com.petcare.backend.common.CurrentUser;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Hogares", description = "Hogares, miembros e invitaciones enviadas")
@RequestMapping("/api/households")
public class HouseholdController {

    private final HouseholdService householdService;
    private final CurrentUser currentUser;

    public HouseholdController(HouseholdService householdService, CurrentUser currentUser) {
        this.householdService = householdService;
        this.currentUser = currentUser;
    }

    @Operation(summary = "Listar mis hogares", description = "Con mi rol y el número de mascotas activas.")
    @GetMapping
    public List<HouseholdSummary> listMyHouseholds() {
        return householdService.listMine(currentUser.id());
    }

    @Operation(summary = "Crear hogar", description = "Quien lo crea queda como OWNER. timezone es opcional (America/Bogota).")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public HouseholdSummary create(@Valid @RequestBody SaveHouseholdRequest request) {
        return householdService.create(currentUser.id(), request);
    }

    @Operation(summary = "Editar hogar", description = "Nombre y zona horaria. Solo OWNER (403 para CAREGIVER); 400 si la zona no es válida.")
    @PutMapping("/{id}")
    public HouseholdSummary update(@PathVariable Long id, @Valid @RequestBody SaveHouseholdRequest request) {
        return householdService.update(id, currentUser.id(), request);
    }

    @Operation(summary = "Listar miembros", description = "Miembros activos e invitados. Solo para miembros del hogar.")
    @GetMapping("/{id}/members")
    public List<MemberResponse> listMembers(@PathVariable Long id) {
        return householdService.listMembers(id, currentUser.id());
    }

    @Operation(summary = "Invitar a un usuario", description = "Solo OWNER. El usuario debe estar registrado; queda como CAREGIVER INVITED.")
    @PostMapping("/{id}/invitations")
    @ResponseStatus(HttpStatus.CREATED)
    public MemberResponse invite(@PathVariable Long id, @Valid @RequestBody InviteMemberRequest request) {
        return householdService.invite(id, currentUser.id(), request);
    }

    @Operation(summary = "Quitar miembro", description = "Solo OWNER. El OWNER no puede quitarse a sí mismo (409).")
    @DeleteMapping("/{id}/members/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(@PathVariable Long id, @PathVariable Long userId) {
        householdService.removeMember(id, currentUser.id(), userId);
    }
}
