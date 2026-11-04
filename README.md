# PetCare

PetCare es una API REST para organizar el cuidado de mascotas en un **hogar compartido**. Cada usuario tiene su hogar, puede invitar a otras personas como cuidadores y entre todos llevan:

- las fichas de las mascotas,
- el historial clínico (consultas, vacunas, desparasitaciones, tratamientos),
- los registros diarios (comidas, peso, bienestar),
- las tareas de cuidado (citas y recordatorios), con un panel del hogar y una línea de tiempo por mascota.

## Stack

| Capa | Tecnología |
|---|---|
| Lenguaje | Java 21 |
| Framework | Spring Boot 4.1 (Web MVC, Validation, Data JPA / Hibernate) |
| Seguridad | Spring Security 7, JWT HS256 (Nimbus), Argon2id con `DelegatingPasswordEncoder` |
| Base de datos | MySQL 8 |
| Documentación | springdoc-openapi 3 (Swagger UI) |
| Pruebas | JUnit 5, Mockito, AssertJ; colección de Postman |
| Build | Maven (wrapper incluido: `mvnw` / `mvnw.cmd`) |

El código está en `backend/`, organizado por funcionalidad en `com.petcare.backend`: `auth`, `users`, `households`, `pets`, `records`, `tasks`, `dashboard`, `timeline`, `common`, `config` y `health`. Las capas siguen el orden Controller → Service → Repository.

## Requisitos

- JDK 21
- MySQL 8 y MySQL Workbench (o el cliente `mysql`)
- Postman (para la colección de pruebas)
- No hace falta instalar Maven: se usa el wrapper.

## 1. Crear la base de datos

Ejecuta los scripts de `database/` **en orden** (en MySQL Workbench: abrir el archivo → ejecutar):

| Orden | Script | Contenido |
|---|---|---|
| 1 | `01_schema.sql` | Base `petcare_db` y tablas `users`, `households`, `household_members`, `pets` |
| 2 | `02_health_records.sql` | `health_records`, `preventive_doses`, `treatments`, `meals`, `weight_records`, `wellbeing_logs` |
| 3 | `03_care_tasks.sql` | `care_tasks` |

La aplicación no crea ni modifica tablas (`spring.jpa.hibernate.ddl-auto=none`). Cada cambio de esquema va en un script nuevo numerado; los scripts existentes nunca se modifican.

Crea el usuario de la aplicación (ajusta la contraseña):

```sql
CREATE USER 'petcare_app'@'localhost' IDENTIFIED BY 'una-contraseña-segura';
GRANT SELECT, INSERT, UPDATE, DELETE ON petcare_db.* TO 'petcare_app'@'localhost';
```

## 2. Variables de entorno

No hay secretos en el repositorio: todo llega por variables de entorno.

| Variable | Obligatoria | Descripción |
|---|---|---|
| `SPRING_DATASOURCE_PASSWORD` | Sí | Contraseña de `petcare_app` en MySQL (también se acepta `DB_PASSWORD`) |
| `JWT_SECRET` | Sí | Clave HS256 en **Base64**, mínimo 32 bytes aleatorios |
| `SPRING_PROFILES_ACTIVE` | No | `prod` para el perfil de producción |
| `PETCARE_CORS_ALLOWED_ORIGINS` | En `prod` | Orígenes del frontend separados por comas (en local: `http://localhost:5173`) |
| `SPRING_DATASOURCE_URL` | No | Para usar otra URL de MySQL distinta de `jdbc:mysql://localhost:3306/petcare_db` |

Para generar `JWT_SECRET` en PowerShell:

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

Para definir las variables en la sesión actual de PowerShell:

```powershell
$env:SPRING_DATASOURCE_PASSWORD = "una-contraseña-segura"
$env:JWT_SECRET = "pega-aquí-la-clave-base64"
```

## 3. Ejecutar

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

La API queda en `http://localhost:8080`. Para comprobar que está arriba: `GET http://localhost:8080/api/health`.

Perfil de producción (sin SQL en el log, sin Swagger y con CORS tomado de la variable):

```powershell
$env:SPRING_PROFILES_ACTIVE = "prod"
$env:PETCARE_CORS_ALLOWED_ORIGINS = "https://mi-frontend.example.com"
.\mvnw.cmd spring-boot:run
```

### Pruebas

```powershell
cd backend
.\mvnw.cmd -q compile        # compilar
.\mvnw.cmd test              # pruebas unitarias: NO necesitan base de datos
```

Las pruebas unitarias usan Mockito y cubren las reglas de `PetService`, `HouseholdAccessService`, `AuthService` (login genérico, rehash y límite de intentos) y las tareas de cuidado.

La prueba de integración `BackendApplicationTests` (`contextLoads`) levanta toda la aplicación y necesita MySQL y las variables de entorno. Está marcada con `@Tag("integration")` y se excluye por defecto. Para correrla:

```powershell
.\mvnw.cmd test "-Dintegration.tests.excluded=none"
```

## 4. Documentación (Swagger)

Con la aplicación en marcha: **http://localhost:8080/swagger-ui.html** (la especificación OpenAPI está en `/v3/api-docs`).

1. Registra un usuario con `POST /api/auth/register` e inicia sesión con `POST /api/auth/login`.
2. Pulsa **Authorize** y pega el `accessToken` (sin el prefijo `Bearer`).

Swagger solo es público si `petcare.docs.enabled=true`, que es el valor por defecto en local. En el perfil `prod` está deshabilitado.

## 5. Postman

Archivos en `docs/postman/`:

- `PetCare API.postman_collection.json`: la colección.
- `PetCare Local.postman_environment.json`: el entorno, con la variable `baseUrl`.

1. Importa los dos archivos, selecciona el entorno **PetCare Local** y verifica que `baseUrl` valga `http://localhost:8080`.
2. Abre la colección → **Run** (Collection Runner) → ejecuta todas las carpetas **en orden**.

La colección encadena variables (`token`, `householdId`, `petId`, `taskId`...) y cada petición tiene pruebas `pm.test` en español, incluidos los casos negativos. Las carpetas son:

| Carpeta | Qué prueba |
|---|---|
| Health | Estado público sin datos internos |
| Auth | Registro, login, errores genéricos; registra también al usuario B (`tokenB`) |
| Pets | CRUD de mascotas, archivar y restaurar, validaciones |
| Households / Invitations | Hogares, miembros, invitaciones |
| Tasks & Dashboard | Tareas (completar, cancelar, reprogramar, `overdue`), vacuna que genera una tarea, panel, línea de tiempo, B sin acceso |
| Security (IDOR) | B intenta acceder a datos de A (404), luego es invitado (CAREGIVER: 200 / 403) y quitado |
| Rate limiting (login) | 5 fallos → el sexto intento da 429. Va al final y usa un correo propio para no bloquear a A |

Cada ejecución registra usuarios nuevos (correo con marca de tiempo), así que la colección puede correrse muchas veces. El bucle de 5 intentos usa `pm.execution.setNextRequest`, que solo funciona en el Runner.

## 6. Endpoints

Todos requieren `Authorization: Bearer <token>` salvo los marcados como públicos.

### Autenticación y estado

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` | **Público.** Crea la cuenta y su hogar (queda como OWNER) |
| POST | `/api/auth/login` | **Público.** Devuelve el JWT. 429 tras 5 fallos en 15 min |
| GET | `/api/health` | **Público.** `status` y `timestamp` |

### Mascotas

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/pets?householdId=` | Mascotas activas de mis hogares |
| POST | `/api/pets` | Crear (`householdId` opcional: por defecto, mi hogar propio) |
| GET | `/api/pets/{id}` | Ver |
| PUT | `/api/pets/{id}` | Editar (OWNER y CAREGIVER; archivada → 409) |
| PATCH | `/api/pets/{id}/archive` | Archivar (solo OWNER) |
| PATCH | `/api/pets/{id}/restore` | Restaurar (solo OWNER) |

### Hogares e invitaciones

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/households` | Mis hogares, con mi rol y el número de mascotas activas |
| GET | `/api/households/{id}/members` | Miembros (nombre, correo, rol, estado) |
| POST | `/api/households/{id}/invitations` | Invitar por correo (solo OWNER) |
| DELETE | `/api/households/{id}/members/{userId}` | Quitar miembro (solo OWNER; no a sí mismo) |
| GET | `/api/invitations` | Mis invitaciones pendientes |
| POST | `/api/invitations/{householdId}/accept` | Aceptar |
| POST | `/api/invitations/{householdId}/decline` | Rechazar |

### Historial clínico y registros diarios

Todas las rutas aceptan GET (listar) y POST (registrar). No hay borrado físico.

| Ruta | Contenido |
|---|---|
| `/api/pets/{petId}/health-records` | Consultas, diagnósticos, exámenes, cirugías, alergias |
| `/api/pets/{petId}/doses` | Vacunas y desparasitaciones (`nextDueOn` crea una tarea PENDING) |
| `/api/pets/{petId}/treatments` | Tratamientos con medicamentos |
| `/api/pets/{petId}/meals` | Comidas |
| `/api/pets/{petId}/weights` | Pesos (actualiza el peso actual de la mascota) |
| `/api/pets/{petId}/wellbeing` | Ánimo, energía y apetito |

### Tareas, panel y línea de tiempo

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/pets/{petId}/tasks?status=` | Tareas de la mascota |
| POST | `/api/pets/{petId}/tasks` | Crear tarea |
| PUT | `/api/pets/{petId}/tasks/{id}` | Editar (solo PENDING) |
| PATCH | `/api/pets/{petId}/tasks/{id}/complete` | Completar (`completedAt` y `notes` opcionales) |
| PATCH | `/api/pets/{petId}/tasks/{id}/cancel` | Cancelar |
| PATCH | `/api/pets/{petId}/tasks/{id}/reschedule` | Reprogramar (`dueAt`) |
| GET | `/api/households/{id}/tasks?range=upcoming\|overdue\|all&days=7` | Tareas del hogar |
| GET | `/api/households/{id}/dashboard` | Panel del hogar |
| GET | `/api/pets/{petId}/timeline?from=&to=&types=` | Línea de tiempo unificada |

"Vencida" no es un estado guardado: el campo `overdue` se calcula (PENDING y `dueAt` anterior a ahora). "Ahora", "hoy" y los rangos usan la zona horaria del hogar (`households.timezone`). Solo una tarea PENDING se puede editar, completar, cancelar o reprogramar; si no, la API responde 409.

### Errores

Todas las respuestas de error son JSON en español: `{"status": 404, "message": "..."}`. Las de validación incluyen además `errors` por campo.

| Código | Cuándo |
|---|---|
| 400 | Datos o parámetros inválidos |
| 401 | Falta el token, el token es inválido o las credenciales son incorrectas |
| 403 | Eres miembro pero tu rol no permite la acción (p. ej. un CAREGIVER que archiva) |
| 404 | El recurso no existe **o pertenece a un hogar ajeno** |
| 409 | Regla de negocio (correo repetido, tarea no pendiente, mascota archivada...) |
| 429 | Demasiados intentos de login |
| 500 | Error inesperado (sin detalles internos; el error queda en el log) |

## 7. Decisiones de seguridad

- **Contraseñas con Argon2id.** Se usa `DelegatingPasswordEncoder`, que guarda los hashes como `{argon2}$argon2id$...`. Los hashes BCrypt antiguos siguen validando y se **re-cifran** con Argon2id en el siguiente login correcto, el único momento en que se conoce la contraseña en texto plano.
- **Login genérico.** Correo inexistente, contraseña incorrecta y cuenta inactiva dan el mismo mensaje ("Correo o contraseña incorrectos"). Si el correo no existe, igual se verifica un hash de relleno, para que el tiempo de respuesta no delate qué correos están registrados.
- **JWT HS256.** El token se firma con Nimbus. La clave llega por `JWT_SECRET` y se rechaza si mide menos de 32 bytes. El token dura 1 hora y el claim `sub` es el id del usuario. La API es *stateless*: no hay sesión ni cookies, y por eso CSRF está deshabilitado.
- **Autorización por hogar e IDOR.** Cada consulta valida que el usuario sea miembro ACTIVE del hogar del recurso. Un recurso de otro hogar responde **404 con el mismo mensaje que uno inexistente**, para no revelar qué ids existen. 403 solo se usa cuando el usuario ya es miembro pero su rol no alcanza: archivar, restaurar, invitar y quitar miembros son solo para el OWNER.
- **Límite de intentos de login.** Máximo 5 fallos por correo en una ventana deslizante de 15 minutos. Al llegar al límite la API responde 429 con el header `Retry-After`. Los correos inexistentes también cuentan, para que el límite no delate cuáles existen. La implementación está **en memoria**: sirve para una sola instancia y se reinicia con la aplicación. En producción con varias instancias se usaría Redis (o el rate limiting del API gateway), complementado con un límite por IP.
- **Sin divulgación de información.**
  - `/api/health` solo devuelve `status` y `timestamp`.
  - Los errores 500 no incluyen stack traces ni mensajes internos.
  - Las respuestas nunca exponen `password_hash`.
- **Headers de seguridad.** Están activos los de Spring Security por defecto: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Cache-Control: no-store` y HSTS en HTTPS.
- **CORS restringido.** Solo se aceptan los orígenes de `petcare.cors.allowed-origins`, con los métodos GET, POST, PUT, PATCH y DELETE y los headers `Authorization` y `Content-Type`. No se envían credenciales por cookie.
- **Historial clínico trazable.** Los registros de salud no se borran físicamente: tienen `status` (ACTIVE / VOIDED) y guardan `created_by` y `created_at`.
- **Secretos fuera del código.** La contraseña de la base y la clave JWT llegan solo por variables de entorno.
