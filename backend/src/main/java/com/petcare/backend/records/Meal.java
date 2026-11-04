package com.petcare.backend.records;

import jakarta.persistence.AttributeOverride;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "meals")
@AttributeOverride(name = "occurredAt", column = @Column(name = "fed_at", nullable = false))
public class Meal extends PetRecord {

    @Column(nullable = false, length = 120)
    private String food;

    @Column(length = 60)
    private String quantity;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public String getFood() {
        return food;
    }

    public void setFood(String food) {
        this.food = food;
    }

    public String getQuantity() {
        return quantity;
    }

    public void setQuantity(String quantity) {
        this.quantity = quantity;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
