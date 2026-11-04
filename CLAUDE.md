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

## Frontend

### Herramientas de diseño
- Dirección visual y componentes: skill impeccable y plugin frontend-design.
- No usar design-taste-frontend para diseñar pantallas. Solo se puede usar para lint o inspección
  puntual, y únicamente si lo pido yo.
- Antes de ejecutar assets.mjs, pedir mi aprobación. No cargar GSAP, Lenis ni Google Fonts desde CDN.
- No tocar backend/ con estas herramientas.
- Usar la skill impeccable para la dirección visual y el plugin frontend-design para escribir el código.

### Referencia visual
- Imágenes en `docs/design/` (`referencia*.png`). El diseño debe ser de la misma familia visual, con marca propia
  (logo, textos e íconos de PetCare, no copias de la imagen).
- El sistema visual vive en `docs/design/sistema-visual.md`. Antes de construir se elige una variante.

### Stack y reglas
- `frontend/`: React + Vite + JavaScript (sin TypeScript) + CSS puro con variables (sin Tailwind ni librerías de UI).
  Única dependencia extra: `react-router-dom`.
- Fuentes en local (nada de Google Fonts ni CDN). Íconos como SVG propios en `src/assets/icons/`.
- Texto visible en español (Colombia). Valores del backend (`MALE`, `ACTIVE`, etc.) traducidos en `src/i18n/labels.js`.
- Mobile-first: ancho máximo 480px en celular; en escritorio (≥1024px) barra lateral.
- Accesible: labels, foco visible, contraste AA, objetivos táctiles de 44px.
- Usar los nombres EXACTOS de campos y rutas de los DTOs y controladores del backend.

### Arquitectura
- `src/api/client.js`: fetch con `VITE_API_URL` (por defecto `http://localhost:8080`), header `Authorization: Bearer`,
  errores del backend (`{status, message, errors}`) normalizados; un 401 cierra sesión y redirige a `/login`.
- Token en `sessionStorage`, con un comentario sobre el tradeoff frente a XSS.
- `AuthContext` (login, register, logout, usuario actual) y rutas protegidas.
- Componentes base: Button, Input, Select, Card, Chip, Modal, EmptyState, Loader, ErrorMessage, PageHeader,
  AppLayout (Inicio, Mascotas, Calendario, Hogar, Perfil).

### Pantallas de la primera tarea
- `/login` y `/register` con validación en cliente y mensajes del backend.
- `/` (Inicio) con `GET /api/households/{id}/dashboard`: saludo, selector de hogar, resumen, tarjetas de mascotas,
  "Próximos cuidados" ("Hoy", "En 3 días", "Vencida") y estados vacíos con ilustraciones SVG simples.
- Las demás rutas: página "Próximamente".

### Verificación
- `npm run build` sin errores.
- Con el backend en `http://localhost:8080` y `npm run dev`, usar Playwright: registrar un correo de prueba único,
  iniciar sesión y capturar el Inicio a 360, 768 y 1280 px.
- Comparar cada captura con la referencia (colores, radios, sombras, tipografía, espaciado, tamaño de fotos),
  corregir y repetir. Capturas finales en `docs/design/screenshots/`.

## Git
- NO hacer commit ni push.

## Al terminar cada tarea
Dar un REPORTE CORTO EN ESPAÑOL con:
- Archivos creados/modificados.
- Scripts SQL que el usuario debe ejecutar.
- Cómo probar.
- Decisiones o problemas.
