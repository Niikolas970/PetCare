package com.petcare.backend.households;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import com.petcare.backend.common.BadRequestException;
import com.petcare.backend.common.ForbiddenException;
import com.petcare.backend.pets.PetRepository;
import com.petcare.backend.users.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class HouseholdServiceTest {

    private static final Long USER = 1L;
    private static final Long HOUSEHOLD = 10L;

    @Mock private HouseholdRepository householdRepository;
    @Mock private HouseholdMemberRepository memberRepository;
    @Mock private HouseholdAccessService accessService;
    @Mock private UserRepository userRepository;
    @Mock private PetRepository petRepository;

    private HouseholdService service;

    @BeforeEach
    void setUp() {
        service = new HouseholdService(householdRepository, memberRepository, accessService, userRepository, petRepository);
        lenient().when(householdRepository.save(any(Household.class))).thenAnswer(inv -> {
            Household h = inv.getArgument(0);
            if (h.getId() == null) {
                h.setId(HOUSEHOLD);
            }
            return h;
        });
    }

    @Test
    @DisplayName("Crear hogar: quien lo crea queda OWNER ACTIVE y la zona por defecto es America/Bogota")
    void createMakesTheCreatorOwner() {
        HouseholdSummary summary = service.create(USER, new SaveHouseholdRequest("  Casa de campo ", null));

        assertThat(summary.name()).isEqualTo("Casa de campo");
        assertThat(summary.timezone()).isEqualTo("America/Bogota");
        assertThat(summary.myRole()).isEqualTo(MemberRole.OWNER);

        ArgumentCaptor<HouseholdMember> member = ArgumentCaptor.forClass(HouseholdMember.class);
        verify(memberRepository).save(member.capture());
        assertThat(member.getValue().getUserId()).isEqualTo(USER);
        assertThat(member.getValue().getRole()).isEqualTo(MemberRole.OWNER);
        assertThat(member.getValue().getStatus()).isEqualTo(MemberStatus.ACTIVE);
    }

    @Test
    @DisplayName("Editar hogar como OWNER cambia nombre y zona horaria")
    void ownerUpdatesNameAndTimezone() {
        HouseholdMember owner = new HouseholdMember();
        owner.setRole(MemberRole.OWNER);
        when(accessService.requireOwner(HOUSEHOLD, USER)).thenReturn(owner);
        Household household = new Household();
        household.setId(HOUSEHOLD);
        household.setName("Hogar de Ana");
        when(householdRepository.findById(HOUSEHOLD)).thenReturn(Optional.of(household));

        HouseholdSummary summary = service.update(HOUSEHOLD, USER, new SaveHouseholdRequest("Casa Ana", "Europe/Madrid"));

        assertThat(summary.name()).isEqualTo("Casa Ana");
        assertThat(summary.timezone()).isEqualTo("Europe/Madrid");
    }

    @Test
    @DisplayName("Una zona horaria inválida responde 400 y no se guarda nada")
    void invalidTimezoneIsRejected() {
        when(accessService.requireOwner(HOUSEHOLD, USER)).thenReturn(new HouseholdMember());
        Household household = new Household();
        household.setId(HOUSEHOLD);
        when(householdRepository.findById(HOUSEHOLD)).thenReturn(Optional.of(household));

        assertThatThrownBy(() -> service.update(HOUSEHOLD, USER, new SaveHouseholdRequest("Casa", "Marte/Olimpo")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("La zona horaria no es válida");
        verify(householdRepository, never()).save(any());
    }

    @Test
    @DisplayName("Un CAREGIVER no puede editar el hogar (403)")
    void caregiverCannotUpdate() {
        when(accessService.requireOwner(HOUSEHOLD, USER)).thenThrow(new ForbiddenException());

        assertThatThrownBy(() -> service.update(HOUSEHOLD, USER, new SaveHouseholdRequest("Casa", "America/Bogota")))
                .isInstanceOf(ForbiddenException.class);
        verify(householdRepository, never()).save(any());
    }
}
