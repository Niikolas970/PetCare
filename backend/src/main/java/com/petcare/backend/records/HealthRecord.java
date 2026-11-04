package com.petcare.backend.records;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

@Entity
@Table(name = "health_records")
public class HealthRecord extends PetRecord {

    @Enumerated(EnumType.STRING)
    @Column(name = "record_type", nullable = false)
    private HealthRecordType recordType;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 120)
    private String veterinarian;

    public HealthRecordType getRecordType() {
        return recordType;
    }

    public void setRecordType(HealthRecordType recordType) {
        this.recordType = recordType;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getVeterinarian() {
        return veterinarian;
    }

    public void setVeterinarian(String veterinarian) {
        this.veterinarian = veterinarian;
    }
}
