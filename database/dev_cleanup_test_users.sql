-- =====================================================
-- PetCare - Limpieza de usuarios de prueba
-- Archivo: database/dev_cleanup_test_users.sql
--
-- ⚠ SOLO PARA DESARROLLO. NUNCA EN PRODUCCIÓN.
-- Borra FÍSICAMENTE a los usuarios con correo @petcare.test (los que crean las pruebas de Postman
-- y los scripts de verificación) y todos sus datos. En la app los registros clínicos nunca se borran;
-- este script existe solo para limpiar la base de desarrollo.
--
-- Qué se borra:
--   * Usuarios cuyo correo termina en @petcare.test.
--   * Hogares cuyo OWNER es un usuario de prueba Y donde todos los miembros son de prueba
--     (si un usuario real es miembro, el hogar se conserva; solo se quita la membresía de prueba).
--   * Mascotas de esos hogares, con sus registros de salud, comidas, pesos, bienestar y tareas.
--   * En hogares que se conservan: los registros y tareas creados por usuarios de prueba.
--     Las referencias opcionales (completed_by, voided_by) a usuarios de prueba quedan en NULL.
--
-- Cómo usarlo en MySQL Workbench:
--   1. Ejecuta el script completo. El primer SELECT muestra cuántas filas se borrarán por tabla.
--   2. El script NO confirma solo: el COMMIT del final está comentado y la transacción queda abierta.
--      Revisa la vista previa y SELECT email FROM users; luego ejecuta COMMIT; o ROLLBACK; a mano
--      en la misma pestaña (si cierras la conexión sin COMMIT, MySQL deshace los cambios).
--   Requiere un usuario con permiso DELETE (p. ej. root), no petcare_app.
-- =====================================================

USE petcare_db;

-- Workbench bloquea DELETE sin clave en el WHERE; se desactiva solo durante este script
SET @old_safe_updates = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

START TRANSACTION;

-- Hogares a borrar: su OWNER es de prueba y no tienen miembros (de cualquier estado) que no sean de prueba
DROP TEMPORARY TABLE IF EXISTS tmp_cleanup_households;
CREATE TEMPORARY TABLE tmp_cleanup_households (id BIGINT UNSIGNED PRIMARY KEY)
SELECT DISTINCT m.household_id AS id
FROM household_members m
JOIN users u ON u.id = m.user_id
WHERE m.role = 'OWNER'
  AND u.email LIKE '%@petcare.test'
  AND NOT EXISTS (
      SELECT 1
      FROM household_members m2
      JOIN users u2 ON u2.id = m2.user_id
      WHERE m2.household_id = m.household_id
        AND u2.email NOT LIKE '%@petcare.test'
  );

-- Mascotas a borrar: las de esos hogares
DROP TEMPORARY TABLE IF EXISTS tmp_cleanup_pets;
CREATE TEMPORARY TABLE tmp_cleanup_pets (id BIGINT UNSIGNED PRIMARY KEY)
SELECT p.id FROM pets p JOIN tmp_cleanup_households h ON h.id = p.household_id;

-- Usuarios a borrar
DROP TEMPORARY TABLE IF EXISTS tmp_cleanup_users;
CREATE TEMPORARY TABLE tmp_cleanup_users (id BIGINT UNSIGNED PRIMARY KEY)
SELECT id FROM users WHERE email LIKE '%@petcare.test';

-- ---------- 1. Vista previa: cuántas filas se borrarán ----------
-- MySQL no deja usar una tabla temporal dos veces en la misma consulta (ni en un UNION),
-- así que cada conteo va en su propia sentencia y al final se muestran todos juntos.
SET @n_users = (SELECT COUNT(*) FROM tmp_cleanup_users);
SET @n_households = (SELECT COUNT(*) FROM tmp_cleanup_households);
SET @n_pets = (SELECT COUNT(*) FROM tmp_cleanup_pets);
SET @n_members = (SELECT COUNT(*) FROM household_members m
    LEFT JOIN tmp_cleanup_households h ON h.id = m.household_id
    WHERE h.id IS NOT NULL OR m.user_id IN (SELECT id FROM users WHERE email LIKE '%@petcare.test'));
SET @n_tasks = (SELECT COUNT(*) FROM care_tasks
    WHERE pet_id IN (SELECT id FROM tmp_cleanup_pets) OR created_by IN (SELECT id FROM users WHERE email LIKE '%@petcare.test'));
SET @n_health_records = (SELECT COUNT(*) FROM health_records
    WHERE pet_id IN (SELECT id FROM tmp_cleanup_pets) OR created_by IN (SELECT id FROM users WHERE email LIKE '%@petcare.test'));
SET @n_preventive_doses = (SELECT COUNT(*) FROM preventive_doses
    WHERE pet_id IN (SELECT id FROM tmp_cleanup_pets) OR created_by IN (SELECT id FROM users WHERE email LIKE '%@petcare.test'));
SET @n_treatments = (SELECT COUNT(*) FROM treatments
    WHERE pet_id IN (SELECT id FROM tmp_cleanup_pets) OR created_by IN (SELECT id FROM users WHERE email LIKE '%@petcare.test'));
SET @n_meals = (SELECT COUNT(*) FROM meals
    WHERE pet_id IN (SELECT id FROM tmp_cleanup_pets) OR created_by IN (SELECT id FROM users WHERE email LIKE '%@petcare.test'));
SET @n_weight_records = (SELECT COUNT(*) FROM weight_records
    WHERE pet_id IN (SELECT id FROM tmp_cleanup_pets) OR created_by IN (SELECT id FROM users WHERE email LIKE '%@petcare.test'));
SET @n_wellbeing_logs = (SELECT COUNT(*) FROM wellbeing_logs
    WHERE pet_id IN (SELECT id FROM tmp_cleanup_pets) OR created_by IN (SELECT id FROM users WHERE email LIKE '%@petcare.test'));

SELECT 'users' AS tabla, @n_users AS filas_a_borrar
UNION ALL SELECT 'households', @n_households
UNION ALL SELECT 'household_members', @n_members
UNION ALL SELECT 'pets', @n_pets
UNION ALL SELECT 'care_tasks', @n_tasks
UNION ALL SELECT 'health_records', @n_health_records
UNION ALL SELECT 'preventive_doses', @n_preventive_doses
UNION ALL SELECT 'treatments', @n_treatments
UNION ALL SELECT 'meals', @n_meals
UNION ALL SELECT 'weight_records', @n_weight_records
UNION ALL SELECT 'wellbeing_logs', @n_wellbeing_logs;

-- ---------- 2. Borrado en orden de llaves foráneas (hijos antes que padres) ----------

-- 2.1 Tareas (referencian pets, users y preventive_doses): primero, porque source_dose_id apunta a las dosis
DELETE FROM care_tasks
WHERE pet_id IN (SELECT id FROM tmp_cleanup_pets)
   OR created_by IN (SELECT id FROM users WHERE email LIKE '%@petcare.test');
UPDATE care_tasks SET completed_by = NULL
WHERE completed_by IN (SELECT id FROM users WHERE email LIKE '%@petcare.test');

-- 2.2 Registros de la mascota (referencian pets y users)
DELETE FROM health_records
WHERE pet_id IN (SELECT id FROM tmp_cleanup_pets) OR created_by IN (SELECT id FROM users WHERE email LIKE '%@petcare.test');
DELETE FROM preventive_doses
WHERE pet_id IN (SELECT id FROM tmp_cleanup_pets) OR created_by IN (SELECT id FROM users WHERE email LIKE '%@petcare.test');
DELETE FROM treatments
WHERE pet_id IN (SELECT id FROM tmp_cleanup_pets) OR created_by IN (SELECT id FROM users WHERE email LIKE '%@petcare.test');
DELETE FROM meals
WHERE pet_id IN (SELECT id FROM tmp_cleanup_pets) OR created_by IN (SELECT id FROM users WHERE email LIKE '%@petcare.test');
DELETE FROM weight_records
WHERE pet_id IN (SELECT id FROM tmp_cleanup_pets) OR created_by IN (SELECT id FROM users WHERE email LIKE '%@petcare.test');
DELETE FROM wellbeing_logs
WHERE pet_id IN (SELECT id FROM tmp_cleanup_pets) OR created_by IN (SELECT id FROM users WHERE email LIKE '%@petcare.test');

-- 2.3 Anulaciones hechas por usuarios de prueba en registros que se conservan (columnas de 04_void_records.sql)
UPDATE health_records   SET voided_by = NULL WHERE voided_by IN (SELECT id FROM users WHERE email LIKE '%@petcare.test');
UPDATE preventive_doses SET voided_by = NULL WHERE voided_by IN (SELECT id FROM users WHERE email LIKE '%@petcare.test');
UPDATE treatments       SET voided_by = NULL WHERE voided_by IN (SELECT id FROM users WHERE email LIKE '%@petcare.test');
UPDATE meals            SET voided_by = NULL WHERE voided_by IN (SELECT id FROM users WHERE email LIKE '%@petcare.test');
UPDATE weight_records   SET voided_by = NULL WHERE voided_by IN (SELECT id FROM users WHERE email LIKE '%@petcare.test');
UPDATE wellbeing_logs   SET voided_by = NULL WHERE voided_by IN (SELECT id FROM users WHERE email LIKE '%@petcare.test');

-- 2.4 Mascotas de los hogares de prueba (referencian households)
DELETE FROM pets WHERE id IN (SELECT id FROM tmp_cleanup_pets);

-- 2.5 Membresías de usuarios de prueba y de los hogares de prueba (referencian households y users)
DELETE FROM household_members
WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@petcare.test')
   OR household_id IN (SELECT id FROM tmp_cleanup_households);

-- 2.6 Hogares de prueba
DELETE FROM households WHERE id IN (SELECT id FROM tmp_cleanup_households);

-- 2.7 Usuarios de prueba
DELETE FROM users WHERE id IN (SELECT id FROM tmp_cleanup_users);

-- ---------- 3. Confirmar ----------
-- Revisa la vista previa y SELECT email FROM users; luego ejecuta COMMIT; o ROLLBACK; a mano
-- COMMIT;

DROP TEMPORARY TABLE IF EXISTS tmp_cleanup_users;
DROP TEMPORARY TABLE IF EXISTS tmp_cleanup_pets;
DROP TEMPORARY TABLE IF EXISTS tmp_cleanup_households;
SET SQL_SAFE_UPDATES = @old_safe_updates;
