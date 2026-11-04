package com.petcare.backend.households;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.petcare.backend.common.ResourceNotFoundException;
import com.petcare.backend.users.User;
import com.petcare.backend.users.UserRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InvitationService {

    private static final String INVITATION_NOT_FOUND = "La invitación no existe";

    private final HouseholdMemberRepository memberRepository;
    private final HouseholdRepository householdRepository;
    private final UserRepository userRepository;
    private final HouseholdService householdService;

    public InvitationService(HouseholdMemberRepository memberRepository,
                             HouseholdRepository householdRepository,
                             UserRepository userRepository,
                             HouseholdService householdService) {
        this.memberRepository = memberRepository;
        this.householdRepository = householdRepository;
        this.userRepository = userRepository;
        this.householdService = householdService;
    }

    @Transactional(readOnly = true)
    public List<InvitationResponse> listPending(Long userId) {
        List<HouseholdMember> invitations = memberRepository.findByUserIdAndStatus(userId, MemberStatus.INVITED);

        Map<Long, Household> households = householdRepository
                .findAllById(invitations.stream().map(HouseholdMember::getHouseholdId).toList()).stream()
                .collect(Collectors.toMap(Household::getId, Function.identity()));

        return invitations.stream()
                .filter(inv -> households.containsKey(inv.getHouseholdId()))
                .map(inv -> new InvitationResponse(
                        inv.getHouseholdId(),
                        households.get(inv.getHouseholdId()).getName(),
                        inv.getRole(),
                        inviterName(inv.getHouseholdId())))
                .toList();
    }

    @Transactional
    public HouseholdSummary accept(Long householdId, Long userId) {
        HouseholdMember invitation = requireInvitation(householdId, userId);
        invitation.setStatus(MemberStatus.ACTIVE);
        invitation.setJoinedAt(LocalDateTime.now());
        memberRepository.saveAndFlush(invitation);

        return householdService.summaryFor(householdId, userId);
    }

    @Transactional
    public void decline(Long householdId, Long userId) {
        memberRepository.delete(requireInvitation(householdId, userId));
    }

    private HouseholdMember requireInvitation(Long householdId, Long userId) {
        return memberRepository.findByHouseholdIdAndUserId(householdId, userId)
                .filter(m -> m.getStatus() == MemberStatus.INVITED)
                .orElseThrow(() -> new ResourceNotFoundException(INVITATION_NOT_FOUND));
    }

    // Solo el OWNER puede invitar, así que quien invitó es el propietario del hogar
    private String inviterName(Long householdId) {
        return memberRepository
                .findFirstByHouseholdIdAndRoleAndStatusOrderByIdAsc(householdId, MemberRole.OWNER, MemberStatus.ACTIVE)
                .flatMap(owner -> userRepository.findById(owner.getUserId()))
                .map(User::getFullName)
                .orElse(null);
    }
}
