-- =====================================================
-- PetCare - Esquema inicial de base de datos
-- Archivo: database/01_schema.sql
-- Tablas: users, households, household_members, pets
-- =====================================================

CREATE DATABASE IF NOT EXISTS petcare_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE petcare_db;

-- Personas que usan la aplicación
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Hogares que comparten mascotas
CREATE TABLE households (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    timezone VARCHAR(60) NOT NULL DEFAULT 'America/Bogota',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Relación muchos a muchos entre usuarios y hogares, con rol
CREATE TABLE household_members (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    household_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    role ENUM('OWNER','CAREGIVER') NOT NULL DEFAULT 'CAREGIVER',
    status ENUM('ACTIVE','INVITED','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    joined_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_member_household FOREIGN KEY (household_id) REFERENCES households(id),
    CONSTRAINT fk_member_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT uq_household_user UNIQUE (household_id, user_id),
    INDEX idx_member_user (user_id)
);

-- Mascotas pertenecientes a un hogar
CREATE TABLE pets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    household_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    species VARCHAR(40) NOT NULL,
    breed VARCHAR(100) NULL,
    sex ENUM('MALE','FEMALE','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
    birth_date DATE NULL,
    birth_date_is_estimated BOOLEAN NOT NULL DEFAULT FALSE,
    weight_kg DECIMAL(7,3) NULL,
    photo_url VARCHAR(500) NULL,
    notes TEXT NULL,
    status ENUM('ACTIVE','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pet_household FOREIGN KEY (household_id) REFERENCES households(id),
    INDEX idx_pet_household_status (household_id, status)
);