# Crítica del Inicio (versión 1)

Fuentes: `docs/design/screenshots/inicio-360.png`, `inicio-768.png`, `inicio-1280.png` (versión 1)
y `docs/design/referencia.png`. Marca de estado: ⬜ pendiente, ✅ resuelto (se actualiza tras verificar).

## Problemas y cómo los resuelvo

| # | Problema concreto | Cómo lo resuelvo | Estado |
|---|---|---|---|
| 1 | **Escritorio desperdiciado.** A 1280 px el contenido es una sola columna de 880 px con ~300 px vacíos a la derecha; no hay rejilla. | Rejilla de 12 columnas (máx. 1200 px): principal de 8 columnas y lateral de 4 con acciones rápidas, semana y hogar. | ✅ 12 columnas medidas a 1280 px (8 + 4). |
| 2 | **Tablet tratada como celular.** A 768 px queda una columna de 480 px con 144 px vacíos a cada lado y la barra inferior de celular. | Entre 768 y 1023 px: barra de navegación superior y contenido en 2 columnas. | ✅ Barra superior y rejilla 408 + 272 px a 768 px. |
| 3 | **Barra lateral débil.** Mismo color que el fondo, sin borde; el estado activo es solo una píldora blanca; el usuario es un texto gris suelto. | Barra de 256 px con fondo de superficie y borde sutil; activo con fondo y barra de acento; abajo, bloque con avatar, nombre, correo y "Cerrar sesión" visible. | ✅ Barra lateral con fondo, borde, barra de acento y bloque de usuario. |
| 4 | **El saludo no usa el nombre real.** Tras iniciar sesión se muestra el inicio del correo ("Prueba.unica") porque no existe `/api/users/me`. | Nuevo `GET /api/users/me` (id, fullName, email); AuthContext lo carga al iniciar sesión y al recargar. | ✅ «Buenas noches, Laura» desde /api/users/me. |
| 5 | **Cerrar sesión escondido.** En celular es un ícono sin texto en el encabezado; Perfil es "Próximamente"; a 768 px no hay otra salida. | Menú del usuario en el encabezado (celular y tablet) con "Perfil" y "Cerrar sesión"; Perfil muestra los datos y el botón; en escritorio, en la barra lateral. | ✅ Probado en 360, 768 y 1280 px, y desde Perfil. |
| 6 | **Tipografía pequeña y plana.** Detalle de 13 px, chips de 13 px, navegación de 12 px; títulos de sección de 18 px casi iguales al cuerpo. | Escala fija: cuerpo 16 px, secundario 14 px, H1 34 px, títulos de sección 20 px. Nada por debajo de 14 px. | ✅ 0 textos por debajo de 14 px; H1 34 px, secciones 20 px, cuerpo 16 px. |
| 7 | **El resumen grita y no ayuda.** Un bloque caramelo oscuro con sombra fuerte domina la pantalla, repite el nombre del hogar que ya está en el selector y no lleva a ninguna acción. | Resumen claro en tono miel con el selector de hogar dentro; una frase con los conteos y, si hay vencidos, un enlace "Ver vencidos" que baja a ese grupo. | ✅ Resumen plano en miel con enlace a vencidos. |
| 8 | **Selector de hogar huérfano.** Flota entre el saludo y el resumen, sin etiqueta visible. | Va dentro del bloque resumen, con etiqueta "Hogar". | ✅ Selector dentro del resumen (solo si hay más de un hogar). |
| 9 | **Tarjetas de mascota pobres.** Inicial en un círculo, sin edad ni raza; llevan a "Próximamente"; no hay forma de agregar una mascota. | Avatar ilustrado por especie (64 px), nombre, especie, edad, peso y próximo cuidado como chip; toda la tarjeta lleva a la ficha `/mascotas/:id`; al final, tarjeta "Agregar mascota" que abre el formulario. | ✅ Avatares por especie, edad, peso y chip; enlace a /mascotas/:id. |
| 10 | **Próximos cuidados incompletos y mezclados.** Solo se ve la próxima tarea de cada mascota (`pets[].nextTask`), así que se pierden cuidados; vencidos, hoy y futuros van en la misma lista. | Datos de `GET /api/households/{id}/tasks` (`range=overdue` y `range=upcoming&days=7`), agrupados en "Vencidos", "Hoy" y "Próximos 7 días". | ✅ Vencidos 1, Hoy 2, Próximos 7 días 2 con datos reales. |
| 11 | **No se puede hacer nada desde el Inicio.** No hay acciones rápidas ni forma de completar un cuidado, aunque el backend tiene `PATCH /api/pets/{petId}/tasks/{id}/complete`. | Botón "Marcar como hecho" en cada cuidado; columna "Acciones rápidas": Registrar comida, Registrar peso, Nueva tarea (formularios reales contra la API). | ✅ Marcar como hecho y Registrar peso probados contra la API. |
| 12 | **Flechas que prometen y no cumplen.** Cada cuidado tiene un chevrón y enlaza a "/calendario" (Próximamente). | Se quitan los chevrones; la fila no es un enlace falso; el nombre de la mascota sí lleva a su ficha. | ✅ Sin chevrones; 0 objetivos táctiles por debajo de 44 px. |
| 13 | **Falta contexto de la semana y del hogar.** No se ve qué días vienen cargados ni quién más cuida a las mascotas. | Franja de la semana (hoy + 6 días) con los días con cuidados marcados, y "Mi hogar" con miembros, rol y estado (`GET /api/households/{id}/members`). | ✅ Semana con 3 días marcados y 2 miembros con rol. |
| 14 | **Interacción sin respuesta.** Las tarjetas no tienen estado presionado, el hover se activa también en táctil y nada se anima al cambiar de estado. | Hover solo con puntero fino, `:active` con escala 0,97, foco visible; entrada escalonada de tarjetas y salida animada del cuidado completado; todo se reduce con `prefers-reduced-motion`. | ✅ Hover con puntero fino, :active 0,97, entrada escalonada y salida animada. |
| 15 | **Verificación con datos simulados.** Las capturas de la versión 1 se hicieron con respuestas falsas de la API. | Cero mocks: datos creados por la API real (hogar, 3 mascotas, tareas, peso, segundo miembro) y capturas contra el backend en 8080. | ✅ Capturas contra el backend real en 8080. |

## Plan de diseño (frontend-design + impeccable)

- **Modo:** Operate (la persona completa tareas). La marca vive en los detalles, no en adornos.
- **Color (variante B «Miel»):** fondo `#F5EADD`, superficie `#FFF9F1`, blanco `#FFFFFF` para lo elevado,
  caramelo `#98591F` solo para la acción principal y el estado activo, texto `#2A1D14` / `#6A5A4D`,
  pasteles por tipo de cuidado. El resumen pasa de caramelo oscuro a miel claro: el caramelo queda para actuar.
- **Tipo:** Outfit (todo) y Caveat solo para una nota manuscrita en el resumen. Escala 34 / 20 / 16 / 14.
- **Lo memorable (un solo lugar):** los avatares ilustrados por especie y la franja de la semana. Todo lo demás, sobrio.
- **Alineación:** todo a la izquierda; números con cifras tabulares.

```
Escritorio ≥1024                         Tablet 768–1023               Celular <768
┌──────┬───────────────────┬─────────┐   ┌──────────────────────────┐   ┌────────────┐
│ Logo │ Saludo            │ Acciones│   │ Logo  nav nav nav  (👤)  │   │ Logo   (👤)│
│ Nav  │ Resumen + hogar   │ rápidas │   ├───────────────┬──────────┤   │ Saludo     │
│ ▌Ini │ Mis mascotas ▢▢▢+ │ Semana  │   │ Saludo        │ Acciones │   │ Resumen    │
│      │ Próximos cuidados │ Mi hogar│   │ Resumen       │ Semana   │   │ Mascotas → │
│ (👤) │  Vencidos/Hoy/7d  │         │   │ Mascotas ▢▢+  │ Mi hogar │   │ Acciones   │
│ Salir│                   │         │   │ Cuidados      │          │   │ Cuidados   │
└──────┴───────────────────┴─────────┘   └───────────────┴──────────┘   │ Semana     │
 256px    8 columnas         4 col                                      │ Mi hogar   │
                                                                        ├────────────┤
                                                                        │ ⌂ 🐾 ▦ 👥 👤│
                                                                        └────────────┘
```

**Revisión contra el brief:** la v1 caía en el "kit de tarjetas SaaS" (todo en tarjetas iguales con la misma sombra)
y en la plantilla de "métrica en bloque de color". Cambios: las filas de cuidados son una lista dentro de un panel
(no una tarjeta por fila), el resumen deja de ser un bloque de color con sombra, y las sombras se reservan para lo
que se puede tocar (tarjetas de mascota, menús, diálogos).
