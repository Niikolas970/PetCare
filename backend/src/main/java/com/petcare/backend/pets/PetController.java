package com.petcare.backend.pets;

import java.net.URI;
import java.util.List;

import com.petcare.backend.common.ResourceNotFoundException;
import com.petcare.backend.households.HouseholdRepository;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pets")
public class PetController {

    private final PetRepository petRepository;
    private final HouseholdRepository householdRepository;

    public PetController(PetRepository petRepository, HouseholdRepository householdRepository) {
        this.petRepository = petRepository;
        this.householdRepository = householdRepository;
    }


    @GetMapping
    public List<Pet> listActivePets() {
        return petRepository.findByStatus(PetStatus.ACTIVE);
    }


    @PostMapping
    public ResponseEntity<Pet> createPet(@Valid @RequestBody CreatePetRequest request) {


        if (!householdRepository.existsById(request.householdId())) {
            throw new ResourceNotFoundException(
                    "El hogar con id " + request.householdId() + " no existe");
        }


        Pet pet = new Pet();
        pet.setHouseholdId(request.householdId());
        pet.setName(request.name().trim());
        pet.setSpecies(request.species().trim());
        pet.setBreed(request.breed());
        pet.setBirthDate(request.birthDate());
        pet.setBirthDateIsEstimated(Boolean.TRUE.equals(request.birthDateIsEstimated()));
        pet.setWeightKg(request.weightKg());
        pet.setNotes(request.notes());

        if (request.sex() != null) {
            pet.setSex(request.sex());
        }


        Pet saved = petRepository.save(pet);

        return ResponseEntity
                .created(URI.create("/api/pets/" + saved.getId()))
                .body(saved);
    }
}