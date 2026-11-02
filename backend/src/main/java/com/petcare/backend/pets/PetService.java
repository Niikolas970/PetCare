package com.petcare.backend.pets;

import java.util.List;

import com.petcare.backend.common.BusinessRuleException;
import com.petcare.backend.common.ResourceNotFoundException;
import com.petcare.backend.households.HouseholdRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PetService {

    private final PetRepository petRepository;
    private final HouseholdRepository householdRepository;

    public PetService(PetRepository petRepository, HouseholdRepository householdRepository) {
        this.petRepository = petRepository;
        this.householdRepository = householdRepository;
    }

    @Transactional(readOnly = true)
    public List<Pet> listActive() {
        return petRepository.findByStatus(PetStatus.ACTIVE);
    }

    @Transactional(readOnly = true)
    public Pet getById(Long id) {
        return petRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "La mascota con id " + id + " no existe"));
    }

    @Transactional
    public Pet create(CreatePetRequest request) {
        if (!householdRepository.existsById(request.householdId())) {
            throw new ResourceNotFoundException(
                    "El hogar con id " + request.householdId() + " no existe");
        }

        Pet pet = new Pet();
        pet.setHouseholdId(request.householdId());
        applyDetails(pet, request);

        return petRepository.save(pet);
    }

    @Transactional
    public Pet update(Long id, UpdatePetRequest request) {
        Pet pet = getById(id);

        // Regla de negocio: una mascota archivada no se edita
        if (pet.getStatus() == PetStatus.ARCHIVED) {
            throw new BusinessRuleException(
                    "No se puede editar una mascota archivada. Restáurala primero.");
        }

        applyDetails(pet, request);

        return petRepository.save(pet);
    }

    @Transactional
    public Pet archive(Long id) {
        Pet pet = getById(id);
        pet.setStatus(PetStatus.ARCHIVED);

        return petRepository.save(pet);
    }

    @Transactional
    public Pet restore(Long id) {
        Pet pet = getById(id);
        pet.setStatus(PetStatus.ACTIVE);

        return petRepository.save(pet);
    }

    private void applyDetails(Pet pet, PetDetails details) {
        pet.setName(details.name().trim());
        pet.setSpecies(details.species().trim());
        pet.setBreed(details.breed());
        pet.setSex(details.sex() != null ? details.sex() : Sex.UNKNOWN);
        pet.setBirthDate(details.birthDate());
        pet.setBirthDateIsEstimated(Boolean.TRUE.equals(details.birthDateIsEstimated()));
        pet.setWeightKg(details.weightKg());
        pet.setNotes(details.notes());
    }
}