package com.petcare.backend.records;

import java.time.LocalDate;

import jakarta.persistence.AttributeOverride;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

// Vacuna o desparasitación
@Entity
@Table(name = "preventive_doses")
@AttributeOverride(name = "occurredAt", column = @Column(name = "applied_at", nullable = false))
public class PreventiveDose extends PetRecord {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DoseKind kind;

    @Column(name = "product_name", nullable = false, length = 120)
    private String productName;

    @Column(name = "next_due_on")
    private LocalDate nextDueOn;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public DoseKind getKind() {
        return kind;
    }

    public void setKind(DoseKind kind) {
        this.kind = kind;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public LocalDate getNextDueOn() {
        return nextDueOn;
    }

    public void setNextDueOn(LocalDate nextDueOn) {
        this.nextDueOn = nextDueOn;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
