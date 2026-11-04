package com.petcare.backend.pets;

import java.math.BigDecimal;
import java.util.List;

import com.petcare.backend.common.BusinessRuleException;
import com.petcare.backend.common.ResourceNotFoundException;
import com.petcare.backend.households.HouseholdAccessService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PetService {

    private final PetRepository petRepository;
    private final HouseholdAccessService accessService;

    public PetService(PetRepository petRepository, HouseholdAccessService accessService) {
        this.petRepository = petRepository;
        this.accessService = accessService;
    }

    @Transactional(readOnly = true)
    public List<Pet> listActive(Long userId, Long householdId) {
        return list(userId, householdId, PetStatus.ACTIVE);
    }

    /** Mascotas de mis hogares (o de uno) con el estado pedido; los miembros CAREGIVER también ven las archivadas. */
    @Transactional(readOnly = true)
    public List<Pet> list(Long userId, Long householdId, PetStatus status) {
        List<Long> householdIds;
        if (householdId != null) {
            accessService.requireMember(householdId, userId);
            householdIds = List.of(householdId);
        } else {
            householdIds = accessService.householdIdsOf(userId);
        }

        if (householdIds.isEmpty()) {
            return List.of();
        }
        return petRepository.findByHouseholdIdInAndStatusOrderByIdAsc(householdIds, status);
    }

    /**
     * Una mascota de un hogar ajeno responde igual que una inexistente (404),
     * para no revelar qué ids existen.
     */
    @Transactional(readOnly = true)
    public Pet getById(Long id, Long userId) {
        return petRepository.findById(id)
                .filter(pet -> accessService.isMember(pet.getHouseholdId(), userId))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "La mascota con id " + id + " no existe"));
    }

    /**
     * Mascota del usuario a la que se le pueden agregar registros o tareas:
     * 404 si no existe o es de otro hogar, 409 si está archivada.
     */
    @Transactional(readOnly = true)
    public Pet requireWritable(Long id, Long userId) {
        Pet pet = getById(id, userId);
        if (pet.getStatus() == PetStatus.ARCHIVED) {
            throw new BusinessRuleException(
                    "No se pueden agregar registros a una mascota archivada. Restáurala primero.");
        }
        return pet;
    }

    @Transactional(readOnly = true)
    public List<Pet> listActiveInHousehold(Long householdId) {
        return petRepository.findByHouseholdIdInAndStatusOrderByIdAsc(List.of(householdId), PetStatus.ACTIVE);
    }

    @Transactional
    public void updateCurrentWeight(Pet pet, BigDecimal weightKg) {
        pet.setWeightKg(weightKg);
        petRepository.save(pet);
    }

    @Transactional
    public Pet create(CreatePetRequest request, Long userId) {
        Long householdId = request.householdId();
        if (householdId != null) {
            accessService.requireMember(householdId, userId);
        } else {
            householdId = accessService.ownedHouseholdId(userId);
        }

        Pet pet = new Pet();
        pet.setHouseholdId(householdId);
        applyDetails(pet, request);

        return petRepository.save(pet);
    }

    @Transactional
    public Pet update(Long id, UpdatePetRequest request, Long userId) {
        Pet pet = getById(id, userId);

        // Regla de negocio: una mascota archivada no se edita
        if (pet.getStatus() == PetStatus.ARCHIVED) {
            throw new BusinessRuleException(
                    "No se puede editar una mascota archivada. Restáurala primero.");
        }

        applyDetails(pet, request);

        return petRepository.save(pet);
    }

    @Transactional
    public Pet archive(Long id, Long userId) {
        Pet pet = getById(id, userId);
        accessService.requireOwner(pet.getHouseholdId(), userId);
        pet.setStatus(PetStatus.ARCHIVED);

        return petRepository.save(pet);
    }

    @Transactional
    public Pet restore(Long id, Long userId) {
        Pet pet = getById(id, userId);
        accessService.requireOwner(pet.getHouseholdId(), userId);
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
