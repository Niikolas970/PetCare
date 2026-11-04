# PetCare – reglas del proyecto

## Stack
- Backend en `backend/`: Java 21, Spring Boot 4.1, Spring Security (JWT HS256 con Nimbus, Argon2id con `DelegatingPasswordEncoder`), JPA/Hibernate, MySQL 8, Maven.

## Estructura y arquitectura
- Paquete base `com.petcare.backend`, organizado por funcionalidad: `pets/`, `households/`, `users/`, `auth/`, `common/`, `config/`, `health/`, etc.
- Capas: Controller → Service → Repository. Los controladores nunca usan repositorios directamente.
- DTOs como `record`. Validaciones con mensajes en español.
- Nunca exponer entidades con datos sensibles ni `password_hash`.
- Código en inglés; mensajes al usuario en español.

## Errores
Manejados en `common/ApiExceptionHandler`:
- `ResourceNotFoundException` → 404
- `BusinessRuleException` → 409
- `InvalidCredentialsException` → 401

## Base de datos
- `spring.jpa.hibernate.ddl-auto=none`.
- Los cambios van en scripts nuevos `database/0N_descripcion.sql`. Nunca modificar scripts existentes.
- El usuario ejecuta los scripts en MySQL Workbench.
- Historial clínico: sin borrado físico de registros de salud; usar estados y trazabilidad (`created_by`, `created_at`).

## Secretos
- Ningún secreto en archivos. Solo variables de entorno: `SPRING_DATASOURCE_PASSWORD`, `JWT_SECRET`.

## Postman
- Colección: `docs/postman/PetCare API.postman_collection.json`.
- Cada endpoint nuevo lleva su petición con pruebas `pm.test` en español, incluidos casos negativos.
- Usar `{{baseUrl}}`, `{{token}}` y variables encadenadas.
- Las peticiones deben funcionar en orden con el Runner.

## Verificación
- `cd backend; .\mvnw.cmd -q compile`
- La app y los tests de integración necesitan variables de entorno que no están en el código.

## Git
- NO hacer commit ni push.

## Al terminar cada tarea
Dar un REPORTE CORTO EN ESPAÑOL con:
- Archivos creados/modificados.
- Scripts SQL que el usuario debe ejecutar.
- Cómo probar.
- Decisiones o problemas.
