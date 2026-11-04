package com.petcare.backend.records;

import java.math.BigDecimal;

import jakarta.persistence.AttributeOverride;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "weight_records")
@AttributeOverride(name = "occurredAt", column = @Column(name = "measured_at", nullable = false))
public class WeightRecord extends PetRecord {

    @Column(name = "weight_kg", nullable = false, precision = 7, scale = 3)
    private BigDecimal weightKg;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public BigDecimal getWeightKg() {
        return weightKg;
    }

    public void setWeightKg(BigDecimal weightKg) {
        this.weightKg = weightKg;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
