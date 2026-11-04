package com.petcare.backend.households;

import java.time.DateTimeException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.petcare.backend.common.BadRequestException;
import com.petcare.backend.common.BusinessRuleException;
import com.petcare.backend.common.ResourceNotFoundException;
import com.petcare.backend.pets.PetRepository;
import com.petcare.backend.pets.PetStatus;
import com.petcare.backend.users.User;
import com.petcare.backend.users.UserRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HouseholdService {

    private static final List<MemberStatus> VISIBLE_STATUSES = List.of(MemberStatus.ACTIVE, MemberStatus.INVITED);

    private final HouseholdRepository householdRepository;
    private final HouseholdMemberRepository memberRepository;
    private final HouseholdAccessService accessService;
    private final UserRepository userRepository;
    private final PetRepository petRepository;

    public HouseholdService(HouseholdRepository householdRepository,
                            HouseholdMemberRepository memberRepository,
                            HouseholdAccessService accessService,
                            UserRepository userRepository,
                            PetRepository petRepository) {
        this.householdRepository = householdRepository;
        this.memberRepository = memberRepository;
        this.accessService = accessService;
        this.userRepository = userRepository;
        this.petRepository = petRepository;
    }

    @Transactional(readOnly = true)
    public List<HouseholdSummary> listMine(Long userId) {
        List<HouseholdMember> memberships = memberRepository.findByUserIdAndStatus(userId, MemberStatus.ACTIVE);

        Map<Long, Household> households = householdRepository
                .findAllById(memberships.stream().map(HouseholdMember::getHouseholdId).toList()).stream()
                .collect(Collectors.toMap(Household::getId, Function.identity()));

        return memberships.stream()
                .filter(m -> households.containsKey(m.getHouseholdId()))
                .map(m -> toSummary(households.get(m.getHouseholdId()), m.getRole()))
                .toList();
    }

    @Transactional(readOnly = true)
    public HouseholdSummary summaryFor(Long householdId, Long userId) {
        HouseholdMember member = accessService.requireMember(householdId, userId);
        Household household = householdRepository.findById(householdId)
                .orElseThrow(() -> new ResourceNotFoundException(HouseholdAccessService.HOUSEHOLD_NOT_FOUND));
        return toSummary(household, member.getRole());
    }

    @Transactional(readOnly = true)
    public List<MemberResponse> listMembers(Long householdId, Long userId) {
        accessService.requireMember(householdId, userId);

        List<HouseholdMember> members =
                memberRepository.findByHouseholdIdAndStatusInOrderByIdAsc(householdId, VISIBLE_STATUSES);

        Map<Long, User> users = userRepository
                .findAllById(members.stream().map(HouseholdMember::getUserId).toList()).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        return members.stream()
                .filter(m -> users.containsKey(m.getUserId()))
                .map(m -> toMemberResponse(m, users.get(m.getUserId())))
                .toList();
    }

    @Transactional
    public MemberResponse invite(Long householdId, Long userId, InviteMemberRequest request) {
        accessService.requireOwner(householdId, userId);

        String email = request.email().trim().toLowerCase(Locale.ROOT);
        User invited = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("No existe un usuario registrado con ese correo"));

        HouseholdMember member = memberRepository.findByHouseholdIdAndUserId(householdId, invited.getId())
                .orElse(null);

        if (member != null && member.getStatus() == MemberStatus.ACTIVE) {
            throw new BusinessRuleException("El usuario ya es miembro de este hogar");
        }
        if (member != null && member.getStatus() == MemberStatus.INVITED) {
            throw new BusinessRuleException("El usuario ya tiene una invitación pendiente a este hogar");
        }

        // Un exmiembro (INACTIVE) reutiliza su fila: la tabla tiene UNIQUE (household_id, user_id)
        if (member == null) {
            member = new HouseholdMember();
            member.setHouseholdId(householdId);
            member.setUserId(invited.getId());
        }
        member.setRole(MemberRole.CAREGIVER);
        member.setStatus(MemberStatus.INVITED);
        member.setJoinedAt(null);
        member = memberRepository.save(member);

        return toMemberResponse(member, invited);
    }

    @Transactional
    public void removeMember(Long householdId, Long userId, Long memberUserId) {
        accessService.requireOwner(householdId, userId);

        if (userId.equals(memberUserId)) {
            throw new BusinessRuleException("El propietario no puede quitarse a sí mismo del hogar");
        }

        HouseholdMember member = memberRepository.findByHouseholdIdAndUserId(householdId, memberUserId)
                .filter(m -> VISIBLE_STATUSES.contains(m.getStatus()))
                .orElseThrow(() -> new ResourceNotFoundException("El miembro no existe en este hogar"));

        // Se conserva la fila como INACTIVE para mantener la trazabilidad de quién tuvo acceso
        member.setStatus(MemberStatus.INACTIVE);
        memberRepository.save(member);
    }

    /** Crea un hogar nuevo: quien lo crea queda como OWNER ACTIVE. */
    @Transactional
    public HouseholdSummary create(Long userId, SaveHouseholdRequest request) {
        Household household = new Household();
        household.setName(request.name().trim());
        household.setTimezone(request.timezone() == null || request.timezone().isBlank()
                ? HouseholdClock.DEFAULT_ZONE.getId()
                : validZone(request.timezone()));
        household = householdRepository.save(household);

        HouseholdMember owner = new HouseholdMember();
        owner.setHouseholdId(household.getId());
        owner.setUserId(userId);
        owner.setRole(MemberRole.OWNER);
        owner.setStatus(MemberStatus.ACTIVE);
        owner.setJoinedAt(LocalDateTime.now());
        memberRepository.save(owner);

        return toSummary(household, MemberRole.OWNER);
    }

    /**
     * Cambia nombre y zona horaria (solo OWNER). Las fechas ya guardadas no se convierten:
     * se interpretan como hora local de la nueva zona.
     */
    @Transactional
    public HouseholdSummary update(Long householdId, Long userId, SaveHouseholdRequest request) {
        HouseholdMember member = accessService.requireOwner(householdId, userId);
        Household household = householdRepository.findById(householdId)
                .orElseThrow(() -> new ResourceNotFoundException(HouseholdAccessService.HOUSEHOLD_NOT_FOUND));

        household.setName(request.name().trim());
        if (request.timezone() != null && !request.timezone().isBlank()) {
            household.setTimezone(validZone(request.timezone()));
        }
        return toSummary(householdRepository.save(household), member.getRole());
    }

    static String validZone(String timezone) {
        try {
            return ZoneId.of(timezone.trim()).getId();
        } catch (DateTimeException ex) {
            throw new BadRequestException("La zona horaria no es válida: '" + timezone.trim() + "'. Usa un nombre como America/Bogota.");
        }
    }

    private HouseholdSummary toSummary(Household household, MemberRole role) {
        long activePets = petRepository.countByHouseholdIdAndStatus(household.getId(), PetStatus.ACTIVE);
        return new HouseholdSummary(household.getId(), household.getName(), household.getTimezone(), role, activePets);
    }

    private MemberResponse toMemberResponse(HouseholdMember member, User user) {
        return new MemberResponse(user.getId(), user.getFullName(), user.getEmail(),
                member.getRole(), member.getStatus(), member.getJoinedAt());
    }
}
