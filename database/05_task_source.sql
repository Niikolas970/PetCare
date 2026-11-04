-- =====================================================
-- PetCare - Origen de las tareas generadas por una dosis
-- Archivo: database/05_task_source.sql
-- Requiere: 02_health_records.sql y 03_care_tasks.sql
--
-- Una vacuna o desparasitación con próxima dosis crea una tarea PENDING.
-- source_dose_id guarda de qué dosis salió, para cancelarla si la dosis se anula.
-- Las tareas creadas antes de este script quedan con source_dose_id NULL.
-- =====================================================

USE petcare_db;

ALTER TABLE care_tasks
    ADD COLUMN source_dose_id BIGINT UNSIGNED NULL AFTER pet_id,
    ADD CONSTRAINT fk_task_source_dose FOREIGN KEY (source_dose_id) REFERENCES preventive_doses(id);
