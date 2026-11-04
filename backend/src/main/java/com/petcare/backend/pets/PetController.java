package com.petcare.backend.pets;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.net.URI;
import java.util.List;

import com.petcare.backend.common.CurrentUser;
import com.petcare.backend.common.EnumParams;

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
@Tag(name = "Mascotas", description = "Mascotas de los hogares del usuario")
@RequestMapping("/api/pets")
public class PetController {

    private final PetService petService;
    private final CurrentUser currentUser;

    public PetController(PetService petService, CurrentUser currentUser) {
        this.petService = petService;
        this.currentUser = currentUser;
    }

    @Operation(summary = "Listar mascotas",
            description = "Mascotas de mis hogares; ?householdId= filtra por un hogar y ?status=ACTIVE (por defecto) o ARCHIVED.")
    @GetMapping
    public List<Pet> listPets(@RequestParam(required = false) Long householdId,
                              @RequestParam(required = false) String status) {
        PetStatus parsed = EnumParams.parse(PetStatus.class, status, "status");
        return petService.list(currentUser.id(), householdId, parsed == null ? PetStatus.ACTIVE : parsed);
    }

    @Operation(summary = "Ver mascota", description = "404 si no existe o es de un hogar ajeno.")
    @GetMapping("/{id}")
    public Pet getPet(@PathVariable Long id) {
        return petService.getById(id, currentUser.id());
    }

    @Operation(summary = "Crear mascota", description = "householdId es opcional: si no se envía se usa el hogar donde soy OWNER.")
    @PostMapping
    public ResponseEntity<Pet> createPet(@Valid @RequestBody CreatePetRequest request) {
        Pet saved = petService.create(request, currentUser.id());

        return ResponseEntity
                .created(URI.create("/api/pets/" + saved.getId()))
                .body(saved);
    }

    @Operation(summary = "Editar mascota", description = "OWNER y CAREGIVER. Una mascota archivada no se edita (409).")
    @PutMapping("/{id}")
    public Pet updatePet(@PathVariable Long id, @Valid @RequestBody UpdatePetRequest request) {
        return petService.update(id, request, currentUser.id());
    }

    @Operation(summary = "Archivar mascota", description = "Solo OWNER (403 para CAREGIVER).")
    @PatchMapping("/{id}/archive")
    public Pet archivePet(@PathVariable Long id) {
        return petService.archive(id, currentUser.id());
    }

    @Operation(summary = "Restaurar mascota", description = "Solo OWNER (403 para CAREGIVER).")
    @PatchMapping("/{id}/restore")
    public Pet restorePet(@PathVariable Long id) {
        return petService.restore(id, currentUser.id());
    }
}
