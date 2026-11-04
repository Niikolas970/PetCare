-- =====================================================
-- PetCare - Historial clínico y registros diarios
-- Archivo: database/02_health_records.sql
-- Tablas: health_records, preventive_doses, treatments, meals, weight_records, wellbeing_logs
--
-- Reglas: no hay borrado físico. Cada registro tiene status (ACTIVE / VOIDED)
-- y trazabilidad (created_by, created_at).
-- Las fechas DATETIME se guardan en la hora local del hogar (households.timezone).
-- =====================================================

USE petcare_db;

-- Consultas, diagnósticos, exámenes, cirugías, alergias
CREATE TABLE health_records (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pet_id BIGINT UNSIGNED NOT NULL,
    record_type ENUM('CONSULTATION','DIAGNOSIS','EXAM','SURGERY','ALLERGY','OTHER') NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NULL,
    veterinarian VARCHAR(120) NULL,
    occurred_at DATETIME NOT NULL,
    status ENUM('ACTIVE','VOIDED') NOT NULL DEFAULT 'ACTIVE',
    created_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_health_record_pet FOREIGN KEY (pet_id) REFERENCES pets(id),
    CONSTRAINT fk_health_record_user FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_health_record_pet_date (pet_id, occurred_at)
);

-- Vacunas y desparasitaciones (next_due_on genera una care_task PENDING)
CREATE TABLE preventive_doses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pet_id BIGINT UNSIGNED NOT NULL,
    kind ENUM('VACCINE','DEWORMING') NOT NULL,
    product_name VARCHAR(120) NOT NULL,
    applied_at DATETIME NOT NULL,
    next_due_on DATE NULL,
    notes TEXT NULL,
    status ENUM('ACTIVE','VOIDED') NOT NULL DEFAULT 'ACTIVE',
    created_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dose_pet FOREIGN KEY (pet_id) REFERENCES pets(id),
    CONSTRAINT fk_dose_user FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_dose_pet_date (pet_id, applied_at)
);

-- Tratamientos con medicamentos
CREATE TABLE treatments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pet_id BIGINT UNSIGNED NOT NULL,
    medication VARCHAR(120) NOT NULL,
    dosage VARCHAR(80) NULL,
    frequency VARCHAR(80) NULL,
    started_at DATETIME NOT NULL,
    ends_on DATE NULL,
    notes TEXT NULL,
    status ENUM('ACTIVE','VOIDED') NOT NULL DEFAULT 'ACTIVE',
    created_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_treatment_pet FOREIGN KEY (pet_id) REFERENCES pets(id),
    CONSTRAINT fk_treatment_user FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_treatment_pet_date (pet_id, started_at)
);

-- Comidas
CREATE TABLE meals (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pet_id BIGINT UNSIGNED NOT NULL,
    food VARCHAR(120) NOT NULL,
    quantity VARCHAR(60) NULL,
    fed_at DATETIME NOT NULL,
    notes TEXT NULL,
    status ENUM('ACTIVE','VOIDED') NOT NULL DEFAULT 'ACTIVE',
    created_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_meal_pet FOREIGN KEY (pet_id) REFERENCES pets(id),
    CONSTRAINT fk_meal_user FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_meal_pet_date (pet_id, fed_at)
);

-- Historial de peso
CREATE TABLE weight_records (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pet_id BIGINT UNSIGNED NOT NULL,
    weight_kg DECIMAL(7,3) NOT NULL,
    measured_at DATETIME NOT NULL,
    notes TEXT NULL,
    status ENUM('ACTIVE','VOIDED') NOT NULL DEFAULT 'ACTIVE',
    created_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_weight_pet FOREIGN KEY (pet_id) REFERENCES pets(id),
    CONSTRAINT fk_weight_user FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_weight_pet_date (pet_id, measured_at)
);

-- Observaciones de bienestar (ánimo, energía, apetito)
CREATE TABLE wellbeing_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pet_id BIGINT UNSIGNED NOT NULL,
    mood ENUM('VERY_BAD','BAD','NORMAL','GOOD','VERY_GOOD') NOT NULL,
    energy ENUM('LOW','NORMAL','HIGH') NULL,
    appetite ENUM('LOW','NORMAL','HIGH') NULL,
    observed_at DATETIME NOT NULL,
    notes TEXT NULL,
    status ENUM('ACTIVE','VOIDED') NOT NULL DEFAULT 'ACTIVE',
    created_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wellbeing_pet FOREIGN KEY (pet_id) REFERENCES pets(id),
    CONSTRAINT fk_wellbeing_user FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_wellbeing_pet_date (pet_id, observed_at)
);
