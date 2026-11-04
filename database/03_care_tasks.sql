-- =====================================================
-- PetCare - Tareas de cuidado (citas y recordatorios)
-- Archivo: database/03_care_tasks.sql
-- Requiere: 01_schema.sql
--
-- "Vencida" no es un estado guardado: se calcula (PENDING y due_at < ahora en la zona del hogar).
-- due_at se guarda en la hora local del hogar (households.timezone).
-- =====================================================

USE petcare_db;

CREATE TABLE care_tasks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pet_id BIGINT UNSIGNED NOT NULL,
    type ENUM('VET_APPOINTMENT','VACCINE','DEWORMING','MEDICATION','GROOMING','PURCHASE','OTHER') NOT NULL,
    title VARCHAR(150) NOT NULL,
    due_at DATETIME NOT NULL,
    location VARCHAR(200) NULL,
    notes TEXT NULL,
    status ENUM('PENDING','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING',
    completed_at DATETIME NULL,
    completed_by BIGINT UNSIGNED NULL,
    created_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_pet FOREIGN KEY (pet_id) REFERENCES pets(id),
    CONSTRAINT fk_task_completed_by FOREIGN KEY (completed_by) REFERENCES users(id),
    CONSTRAINT fk_task_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_task_pet_due (pet_id, due_at),
    INDEX idx_task_status (status)
);
