package com.petcare.backend.dashboard;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.petcare.backend.common.ResourceNotFoundException;
import com.petcare.backend.dashboard.DashboardResponse.PetCard;
import com.petcare.backend.households.Household;
import com.petcare.backend.households.HouseholdAccessService;
import com.petcare.backend.households.HouseholdClock;
import com.petcare.backend.households.HouseholdRepository;
import com.petcare.backend.pets.Pet;
import com.petcare.backend.pets.PetService;
import com.petcare.backend.records.RecordStatus;
import com.petcare.backend.records.WeightRecord;
import com.petcare.backend.records.WeightRecordRepository;
import com.petcare.backend.tasks.CareTaskService;
import com.petcare.backend.timeline.TimelineItem;
import com.petcare.backend.timeline.TimelineService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {

    private static final int RECENT_ACTIVITY_LIMIT = 10;

    private final HouseholdAccessService accessService;
    private final HouseholdRepository householdRepository;
    private final HouseholdClock clock;
    private final PetService petService;
    private final WeightRecordRepository weightRepository;
    private final CareTaskService taskService;
    private final TimelineService timelineService;

    public DashboardService(HouseholdAccessService accessService, HouseholdRepository householdRepository,
                            HouseholdClock clock, PetService petService, WeightRecordRepository weightRepository,
                            CareTaskService taskService, TimelineService timelineService) {
        this.accessService = accessService;
        this.householdRepository = householdRepository;
        this.clock = clock;
        this.petService = petService;
        this.weightRepository = weightRepository;
        this.taskService = taskService;
        this.timelineService = timelineService;
    }

    @Transactional(readOnly = true)
    public DashboardResponse dashboard(Long householdId, Long userId) {
        accessService.requireMember(householdId, userId);
        Household household = householdRepository.findById(householdId)
                .orElseThrow(() -> new ResourceNotFoundException(HouseholdAccessService.HOUSEHOLD_NOT_FOUND));

        List<Pet> pets = petService.listActiveInHousehold(householdId);
        Map<Long, String> petNames = new LinkedHashMap<>();
        pets.forEach(p -> petNames.put(p.getId(), p.getName()));

        LocalDateTime now = clock.now(householdId);
        int days = CareTaskService.DEFAULT_DAYS;

        List<PetCard> cards = pets.stream().map(pet -> toCard(pet, now)).toList();
        List<TimelineItem> activity = timelineService.recentActivity(householdId, petNames, RECENT_ACTIVITY_LIMIT);

        return new DashboardResponse(
                household.getId(),
                household.getName(),
                clock.zoneOf(householdId).getId(),
                clock.today(householdId),
                pets.size(),
                days,
                taskService.countUpcoming(householdId, petNames.keySet(), days),
                taskService.countOverdue(householdId, petNames.keySet()),
                cards,
                activity);
    }

    private PetCard toCard(Pet pet, LocalDateTime now) {
        Optional<WeightRecord> latest =
                weightRepository.findFirstByPetIdAndStatusOrderByOccurredAtDescIdDesc(pet.getId(), RecordStatus.ACTIVE);

        return new PetCard(
                pet.getId(),
                pet.getName(),
                pet.getSpecies(),
                latest.map(WeightRecord::getWeightKg).orElse(pet.getWeightKg()),
                latest.map(WeightRecord::getOccurredAt).orElse(null),
                taskService.nextPending(pet, now).orElse(null));
    }
}
