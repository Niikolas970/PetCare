package com.petcare.backend.households;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

import org.springframework.stereotype.Component;

/**
 * "Ahora" y "hoy" según la zona horaria del hogar (households.timezone).
 * Las fechas DATETIME de la base se guardan en esa hora local.
 */
@Component
public class HouseholdClock {

    public static final ZoneId DEFAULT_ZONE = ZoneId.of("America/Bogota");

    private final HouseholdRepository householdRepository;

    public HouseholdClock(HouseholdRepository householdRepository) {
        this.householdRepository = householdRepository;
    }

    public ZoneId zoneOf(Long householdId) {
        return householdRepository.findById(householdId)
                .map(Household::getTimezone)
                .map(HouseholdClock::toZone)
                .orElse(DEFAULT_ZONE);
    }

    // Sin fracciones de segundo: DATETIME de MySQL no las guarda
    public LocalDateTime now(Long householdId) {
        return LocalDateTime.now(zoneOf(householdId)).truncatedTo(ChronoUnit.SECONDS);
    }

    public LocalDate today(Long householdId) {
        return LocalDate.now(zoneOf(householdId));
    }

    private static ZoneId toZone(String timezone) {
        try {
            return ZoneId.of(timezone);
        } catch (DateTimeException ex) {
            return DEFAULT_ZONE;
        }
    }
}
