package com.petcare.backend.records;

import java.time.LocalDate;

import jakarta.persistence.AttributeOverride;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

// Tratamiento con medicamento; occurredAt es la fecha de inicio
@Entity
@Table(name = "treatments")
@AttributeOverride(name = "occurredAt", column = @Column(name = "started_at", nullable = false))
public class Treatment extends PetRecord {

    @Column(nullable = false, length = 120)
    private String medication;

    @Column(length = 80)
    private String dosage;

    @Column(length = 80)
    private String frequency;

    @Column(name = "ends_on")
    private LocalDate endsOn;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public String getMedication() {
        return medication;
    }

    public void setMedication(String medication) {
        this.medication = medication;
    }

    public String getDosage() {
        return dosage;
    }

    public void setDosage(String dosage) {
        this.dosage = dosage;
    }

    public String getFrequency() {
        return frequency;
    }

    public void setFrequency(String frequency) {
        this.frequency = frequency;
    }

    public LocalDate getEndsOn() {
        return endsOn;
    }

    public void setEndsOn(LocalDate endsOn) {
        this.endsOn = endsOn;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
