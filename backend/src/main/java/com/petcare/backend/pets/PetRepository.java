package com.petcare.backend.pets;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PetRepository extends JpaRepository<Pet, Long> {

    List<Pet> findByHouseholdIdInAndStatusOrderByIdAsc(Collection<Long> householdIds, PetStatus status);

    long countByHouseholdIdAndStatus(Long householdId, PetStatus status);
}
