package com.petcare.backend.records;

import jakarta.persistence.AttributeOverride;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

@Entity
@Table(name = "wellbeing_logs")
@AttributeOverride(name = "occurredAt", column = @Column(name = "observed_at", nullable = false))
public class WellbeingLog extends PetRecord {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Mood mood;

    @Enumerated(EnumType.STRING)
    private Level energy;

    @Enumerated(EnumType.STRING)
    private Level appetite;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public Mood getMood() {
        return mood;
    }

    public void setMood(Mood mood) {
        this.mood = mood;
    }

    public Level getEnergy() {
        return energy;
    }

    public void setEnergy(Level energy) {
        this.energy = energy;
    }

    public Level getAppetite() {
        return appetite;
    }

    public void setAppetite(Level appetite) {
        this.appetite = appetite;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
