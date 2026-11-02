package com.petcare.backend.pets;

import java.net.URI;
import java.util.List;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pets")
public class PetController {

    private final PetService petService;

    public PetController(PetService petService) {
        this.petService = petService;
    }

    @GetMapping
    public List<Pet> listActivePets() {
        return petService.listActive();
    }

    @GetMapping("/{id}")
    public Pet getPet(@PathVariable Long id) {
        return petService.getById(id);
    }

    @PostMapping
    public ResponseEntity<Pet> createPet(@Valid @RequestBody CreatePetRequest request) {
        Pet saved = petService.create(request);

        return ResponseEntity
                .created(URI.create("/api/pets/" + saved.getId()))
                .body(saved);
    }

    @PutMapping("/{id}")
    public Pet updatePet(@PathVariable Long id, @Valid @RequestBody UpdatePetRequest request) {
        return petService.update(id, request);
    }

    @PatchMapping("/{id}/archive")
    public Pet archivePet(@PathVariable Long id) {
        return petService.archive(id);
    }

    @PatchMapping("/{id}/restore")
    public Pet restorePet(@PathVariable Long id) {
        return petService.restore(id);
    }
}