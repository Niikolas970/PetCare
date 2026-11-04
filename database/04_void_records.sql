-- =====================================================
-- PetCare - Trazabilidad de la anulación de registros
-- Archivo: database/04_void_records.sql
-- Requiere: 01_schema.sql y 02_health_records.sql
--
-- Los registros no se borran: se anulan (status = 'VOIDED').
-- Estas columnas guardan quién anuló, cuándo y por qué.
-- voided_at se guarda en la hora local del hogar (households.timezone).
-- =====================================================

USE petcare_db;

ALTER TABLE health_records
    ADD COLUMN voided_by BIGINT UNSIGNED NULL AFTER created_at,
    ADD COLUMN voided_at DATETIME NULL AFTER voided_by,
    ADD COLUMN void_reason VARCHAR(300) NULL AFTER voided_at,
    ADD CONSTRAINT fk_health_record_voided_by FOREIGN KEY (voided_by) REFERENCES users(id);

ALTER TABLE preventive_doses
    ADD COLUMN voided_by BIGINT UNSIGNED NULL AFTER created_at,
    ADD COLUMN voided_at DATETIME NULL AFTER voided_by,
    ADD COLUMN void_reason VARCHAR(300) NULL AFTER voided_at,
    ADD CONSTRAINT fk_dose_voided_by FOREIGN KEY (voided_by) REFERENCES users(id);

ALTER TABLE treatments
    ADD COLUMN voided_by BIGINT UNSIGNED NULL AFTER created_at,
    ADD COLUMN voided_at DATETIME NULL AFTER voided_by,
    ADD COLUMN void_reason VARCHAR(300) NULL AFTER voided_at,
    ADD CONSTRAINT fk_treatment_voided_by FOREIGN KEY (voided_by) REFERENCES users(id);

ALTER TABLE meals
    ADD COLUMN voided_by BIGINT UNSIGNED NULL AFTER created_at,
    ADD COLUMN voided_at DATETIME NULL AFTER voided_by,
    ADD COLUMN void_reason VARCHAR(300) NULL AFTER voided_at,
    ADD CONSTRAINT fk_meal_voided_by FOREIGN KEY (voided_by) REFERENCES users(id);

ALTER TABLE weight_records
    ADD COLUMN voided_by BIGINT UNSIGNED NULL AFTER created_at,
    ADD COLUMN voided_at DATETIME NULL AFTER voided_by,
    ADD COLUMN void_reason VARCHAR(300) NULL AFTER voided_at,
    ADD CONSTRAINT fk_weight_voided_by FOREIGN KEY (voided_by) REFERENCES users(id);

ALTER TABLE wellbeing_logs
    ADD COLUMN voided_by BIGINT UNSIGNED NULL AFTER created_at,
    ADD COLUMN voided_at DATETIME NULL AFTER voided_by,
    ADD COLUMN void_reason VARCHAR(300) NULL AFTER voided_at,
    ADD CONSTRAINT fk_wellbeing_voided_by FOREIGN KEY (voided_by) REFERENCES users(id);
