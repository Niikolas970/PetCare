package com.petcare.backend.pets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import com.petcare.backend.common.BusinessRuleException;
import com.petcare.backend.common.ForbiddenException;
import com.petcare.backend.common.ResourceNotFoundException;
import com.petcare.backend.households.HouseholdAccessService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PetServiceTest {

    private static final Long USER = 1L;
    private static final Long MY_HOUSEHOLD = 10L;
    private static final Long OTHER_HOUSEHOLD = 99L;

    @Mock
    private PetRepository petRepository;

    @Mock
    private HouseholdAccessService accessService;

    private PetService service;

    @BeforeEach
    void setUp() {
        service = new PetService(petRepository, accessService);
    }

    @Test
    @DisplayName("Una mascota de otro hogar responde igual que una inexistente (404, mismo mensaje)")
    void foreignPetLooksLikeAMissingPet() {
        when(petRepository.findById(5L)).thenReturn(Optional.of(pet(5L, OTHER_HOUSEHOLD, PetStatus.ACTIVE)));
        when(accessService.isMember(OTHER_HOUSEHOLD, USER)).thenReturn(false);
        when(petRepository.findById(6L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(5L, USER))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("La mascota con id 5 no existe");
        assertThatThrownBy(() -> service.getById(6L, USER))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("La mascota con id 6 no existe");
    }

    @Test
    void memberCanReadAPet() {
        Pet pet = pet(5L, MY_HOUSEHOLD, PetStatus.ACTIVE);
        when(petRepository.findById(5L)).thenReturn(Optional.of(pet));
        when(accessService.isMember(MY_HOUSEHOLD, USER)).thenReturn(true);

        assertThat(service.getById(5L, USER)).isSameAs(pet);
    }

    @Test
    @DisplayName("Una mascota archivada no se edita (409)")
    void archivedPetCannotBeUpdated() {
        givenMyPet(5L, PetStatus.ARCHIVED);

        assertThatThrownBy(() -> service.update(5L, updateRequest("Coco"), USER))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Restáurala primero");
        verify(petRepository, never()).save(any());
    }

    @Test
    void activePetIsUpdatedWithTrimmedValues() {
        givenMyPet(5L, PetStatus.ACTIVE);
        when(petRepository.save(any(Pet.class))).thenAnswer(inv -> inv.getArgument(0));

        Pet updated = service.update(5L, updateRequest("  Coco  "), USER);

        assertThat(updated.getName()).isEqualTo("Coco");
        assertThat(updated.getSex()).isEqualTo(Sex.UNKNOWN);
    }

    @Test
    @DisplayName("Archivar exige OWNER: un CAREGIVER recibe 403 y la mascota no cambia")
    void archiveRequiresOwner() {
        Pet pet = givenMyPet(5L, PetStatus.ACTIVE);
        when(accessService.requireOwner(MY_HOUSEHOLD, USER)).thenThrow(new ForbiddenException());

        assertThatThrownBy(() -> service.archive(5L, USER)).isInstanceOf(ForbiddenException.class);
        assertThat(pet.getStatus()).isEqualTo(PetStatus.ACTIVE);
        verify(petRepository, never()).save(any());
    }

    @Test
    void ownerCanArchiveAndRestore() {
        Pet pet = givenMyPet(5L, PetStatus.ACTIVE);
        when(petRepository.save(any(Pet.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThat(service.archive(5L, USER).getStatus()).isEqualTo(PetStatus.ARCHIVED);
        assertThat(service.restore(5L, USER).getStatus()).isEqualTo(PetStatus.ACTIVE);
        assertThat(pet.getStatus()).isEqualTo(PetStatus.ACTIVE);
    }

    @Test
    @DisplayName("Sin householdId la mascota se crea en el hogar donde el usuario es OWNER")
    void createWithoutHouseholdUsesTheOwnedHousehold() {
        when(accessService.ownedHouseholdId(USER)).thenReturn(MY_HOUSEHOLD);
        when(petRepository.save(any(Pet.class))).thenAnswer(inv -> inv.getArgument(0));

        Pet created = service.create(createRequest(null), USER);

        assertThat(created.getHouseholdId()).isEqualTo(MY_HOUSEHOLD);
        verify(accessService, never()).requireMember(any(), any());
    }

    @Test
    @DisplayName("Crear en un hogar ajeno falla con 404 y no guarda nada")
    void createInForeignHouseholdFails() {
        when(accessService.requireMember(OTHER_HOUSEHOLD, USER))
                .thenThrow(new ResourceNotFoundException("El hogar no existe"));

        assertThatThrownBy(() -> service.create(createRequest(OTHER_HOUSEHOLD), USER))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("El hogar no existe");
        verify(petRepository, never()).save(any());
    }

    @Test
    void listWithoutHouseholdsReturnsEmptyWithoutQuerying() {
        when(accessService.householdIdsOf(USER)).thenReturn(List.of());

        assertThat(service.listActive(USER, null)).isEmpty();
        verifyNoInteractions(petRepository);
    }

    @Test
    void listFilteredByHouseholdValidatesMembership() {
        when(accessService.requireMember(OTHER_HOUSEHOLD, USER))
                .thenThrow(new ResourceNotFoundException("El hogar no existe"));

        assertThatThrownBy(() -> service.listActive(USER, OTHER_HOUSEHOLD))
                .isInstanceOf(ResourceNotFoundException.class);
        verifyNoInteractions(petRepository);
    }

    @Test
    void listReturnsOnlyActivePetsOfMyHouseholds() {
        when(accessService.householdIdsOf(USER)).thenReturn(List.of(MY_HOUSEHOLD));
        List<Pet> pets = List.of(pet(5L, MY_HOUSEHOLD, PetStatus.ACTIVE));
        when(petRepository.findByHouseholdIdInAndStatusOrderByIdAsc(List.of(MY_HOUSEHOLD), PetStatus.ACTIVE))
                .thenReturn(pets);

        assertThat(service.listActive(USER, null)).isEqualTo(pets);
    }

    @Test
    @DisplayName("No se agregan registros a una mascota archivada (409)")
    void requireWritableRejectsArchivedPets() {
        givenMyPet(5L, PetStatus.ARCHIVED);

        assertThatThrownBy(() -> service.requireWritable(5L, USER)).isInstanceOf(BusinessRuleException.class);
    }

    private Pet givenMyPet(Long id, PetStatus status) {
        Pet pet = pet(id, MY_HOUSEHOLD, status);
        when(petRepository.findById(id)).thenReturn(Optional.of(pet));
        when(accessService.isMember(MY_HOUSEHOLD, USER)).thenReturn(true);
        return pet;
    }

    private static Pet pet(Long id, Long householdId, PetStatus status) {
        Pet pet = new Pet();
        pet.setId(id);
        pet.setHouseholdId(householdId);
        pet.setName("Coco");
        pet.setSpecies("Conejo");
        pet.setStatus(status);
        return pet;
    }

    private static UpdatePetRequest updateRequest(String name) {
        return new UpdatePetRequest(name, "Conejo", null, null, null, null, null, null);
    }

    private static CreatePetRequest createRequest(Long householdId) {
        return new CreatePetRequest(householdId, "Luna", "Gato", null, null, null, null, null, null);
    }
}
