package com.petcare.backend.pets;

import java.math.BigDecimal;
import java.time.LocalDate;

public interface PetDetails {

    String name();

    String species();

    String breed();

    Sex sex();

    LocalDate birthDate();

    Boolean birthDateIsEstimated();

    BigDecimal weightKg();

    String notes();
}
