# Sistema visual de PetCare

Fuente: `docs/design/referencia.png` (3 pantallas móviles: Inicio, Mis mascotas, Ficha de mascota).
Los hex son aproximados, tomados a ojo de la imagen. Se afinan al construir.

## 1. Paleta

| Rol | Hex aprox. | Uso |
|---|---|---|
| Fondo | `#F8F3EE` | Lienzo crema cálido, casi blanco |
| Superficie | `#FCF9F6` | Tarjetas y listas, apenas más claras que el fondo |
| Superficie elevada | `#FFFFFF` | Chips, botones circulares, tarjeta de mascota sobre la foto |
| Primario (caramelo) | `#B68458` | Botón principal, pestaña activa, nav activa |
| Primario degradado | `#C4936A` → `#A8764B` | Solo en el botón grande de acción |
| Texto principal | `#2B2019` | Títulos y nombres (marrón casi negro) |
| Texto secundario | `#8D8077` | Subtítulos, razas, descripciones |
| Texto tenue | `#B3A79E` | Íconos y etiquetas inactivas |
| Acento verde | `#5C8F6B` sobre `#E4EEE5` | Veterinario, salud, "En 24 días" |
| Acento azul | `#4F86D6` sobre `#E6EEF9` | Peluquería, vacunas |
| Acento naranja | `#E0893A` sobre `#FBEADA` | Tienda, peso, "En 1 día" |
| Acento coral | `#D9534F` sobre `#F9E1DE` | Accesorios, corazón, alerta |
| Acento violeta | `#6B63D8` sobre `#E9E7F8` | Actividad |
| Notificación | `#E5483E` | Punto sobre la campana |

Estados propuestos para PetCare (no aparecen todos en la imagen):
- Éxito / lejos: verde `#5C8F6B` sobre `#E4EEE5`.
- Pronto: naranja `#C9741F` sobre `#FBEADA`.
- Vencida / error: coral `#C0443F` sobre `#F9E1DE`.

El color vive en pastel y solo en los íconos y chips. El resto es crema y marrón.

## 2. Tipografía

- Títulos: sans geométrica y redondeada, peso semibold (600). Nombre grande ~28 px, título de sección ~17 px.
- Cuerpo: la misma familia, regular, 13–14 px, con tono secundario para el detalle.
- Acento manuscrito: una frase corta a mano ("Happy Pets, Brighter Lives", "My Best Friend") sobre las fotos, inclinada, en marrón medio.
- Fuentes parecidas, instalables en local (OFL, se guardan como `.woff2` en `src/assets/fonts/`):
  1. **Outfit** para títulos y cuerpo (la más cercana a la geométrica redondeada de la imagen). Alternativa: Poppins.
  2. **Caveat** para el acento manuscrito.

## 3. Forma

- Radios: tarjeta grande y hero 24 px, tarjeta de lista 20 px, mosaico de ícono 16 px, chips y botones píldora (999 px), avatares circulares.
- Sombras: casi invisibles y muy difusas, tintadas de marrón (`0 8px 24px rgba(120, 90, 60, 0.08)`). Los chips blancos sobre foto llevan una sombra aún más suave.
- Bordes: no hay. Las superficies se separan por un cambio mínimo de tono y por el aire.
- Espaciado: márgenes laterales ~20 px, separación entre bloques ~24 px, dentro de la tarjeta ~16 px.
- Densidad: media-baja. Pocos elementos por pantalla, mucha respiración, objetivos grandes.
- Íconos: línea de 2 px, puntas redondeadas, un solo color por ícono, sobre un mosaico pastel.

## 4. Componentes

- **Saludo**: "Buenos días," pequeño en gris, el nombre grande y en negrita, con un emoji de saludo, y una línea de apoyo. A la derecha un botón circular blanco con la campana.
- **Hero**: foto cálida a sangre, título corto en 3 líneas, frase manuscrita, botón píldora caramelo con flecha.
- **Accesos rápidos**: 5 círculos pastel con ícono de línea y etiqueta debajo.
- **Tarjetas de lista**: fila con mosaico pastel de ícono, título, subtítulo gris y chevrón en círculo.
- **Mosaicos de categoría**: cuadrados pastel de colores distintos con ícono y etiqueta.
- **Chips de dato**: píldoras blancas con ícono pequeño ("Macho", "3 años", "28 kg").
- **Chips de estado**: píldora pastel con "En 7 días", verde si hay margen y naranja si es inminente.
- **Fotos de mascotas**: retratos cálidos, bien iluminados, mascota a la derecha del cuadro. Avatares circulares con anillo caramelo en el seleccionado y un círculo "+" para agregar.
- **Navegación inferior**: 5 destinos con ícono de línea y etiqueta; el activo en caramelo, el resto en gris tenue.
- **Encabezados**: título a la izquierda y acción a la derecha ("Agregar mascota" con "+" en círculo); en detalle, flecha atrás en círculo, título centrado y "Editar".
- **Pestañas**: texto con subrayado caramelo corto bajo la activa.
- **CTA grande**: píldora de ancho completo, degradado caramelo, texto blanco y flecha.

## 5. Lo que la hace especial (conservar sí o sí)

1. Todo es crema y marrón cálido; el color aparece solo en pastel, por categoría.
2. Fotos reales y emotivas de mascotas, grandes, que son el centro de cada pantalla.
3. Superficies suaves sin bordes ni sombras duras; todo parece flotar apenas.
4. Íconos de línea redondeada sobre mosaicos pastel, con un color por tema.
5. La nota manuscrita sobre la foto, que le da calidez y personalidad.
6. Botones y chips en píldora y radios generosos en todo.
7. Una sola acción principal por pantalla, en caramelo.

## 6. Marca propia de PetCare

- Logo y nombre PetCare propios; el ícono del logo es una huella o un corazón con patita, en caramelo.
- Textos en español de Colombia y datos del backend; nada copiado de la imagen.
- Íconos SVG propios en `src/assets/icons/`, con el mismo trazo (2 px, redondeado).
- Fotos: no se usan las de la referencia. Hasta tener fotos reales, avatares con la inicial y el ícono de especie sobre fondo pastel, y ilustraciones SVG simples en los estados vacíos.

## 7. Variantes propuestas

### Variante A: «Crema» (más clara)

Casi la imagen tal cual: aire, luz y un caramelo suave.

| Rol | Hex |
|---|---|
| Fondo | `#FAF6F1` |
| Superficie | `#FFFFFF` |
| Primario | `#B68458` (degradado `#C4936A` → `#A8764B`) |
| Texto | `#2B2019` / secundario `#8D8077` |
| Acentos | verde `#5C8F6B`, azul `#4F86D6`, naranja `#E0893A`, coral `#D9534F` |
| Estados | éxito `#5C8F6B`, pronto `#C9741F`, vencida `#C0443F` |

**Inicio**: fondo casi blanco con las tarjetas blancas y sombra mínima. Arriba, "Buenos días," y el nombre del usuario en grande, el selector de hogar como una píldora blanca con el nombre del hogar y un chevrón, y la campana a la derecha. Debajo, una tarjeta de resumen caramelo claro con el conteo de mascotas y de cuidados pendientes. Sigue una fila horizontal de tarjetas de mascotas con avatar grande, nombre, especie y un chip de estado. Después, "Próximos cuidados" como lista con mosaico pastel por tipo, título, mascota y chip "Hoy", "En 3 días" o "Vencida". Sin mascotas, una ilustración SVG simple con un botón "Agregar mascota". Barra inferior de 5 destinos; en escritorio, barra lateral.

### Variante B: «Miel» (más cálida)

Más abrigo: fondo con tinte miel y un marrón más profundo, con mayor contraste.

| Rol | Hex |
|---|---|
| Fondo | `#F5EADD` |
| Superficie | `#FFF9F1` |
| Primario | `#A3652E` (degradado `#B5773F` → `#8F5524`) |
| Texto | `#2A1D14` / secundario `#7F6E62` |
| Acentos | salvia `#5E8A6A`, azul grisáceo `#5B82B5`, ámbar `#D98324`, rosa `#C9605A` |
| Estados | éxito `#4F7F5D`, pronto `#B5651A`, vencida `#B23B36` |

**Inicio**: fondo miel y tarjetas crema con un borde de luz más cálido. El saludo es más grande y aparece sobre un bloque superior de tono miel que se funde con el fondo. El selector de hogar va como píldora crema. El resumen es una tarjeta caramelo profundo con texto claro y un acento manuscrito en Caveat ("Tu familia peluda"). Las mascotas van en tarjetas más altas con foto o avatar grande. "Próximos cuidados" usa mosaicos de color más saturados y chips con más contraste. Los estados vacíos llevan una ilustración cálida con el mismo marrón. La navegación activa es más marcada, con un fondo píldora miel.

## 8. Notas del análisis

- En `docs/design/` solo existe `referencia.png`. Si hay más imágenes (`referencia*.png`) hay que agregarlas y revisar este análisis.
- El contraste del texto secundario sobre crema debe medirse en AA antes de fijarlo: `#8D8077` sobre `#FAF6F1` queda cerca del límite. Se ajusta oscureciéndolo al construir.
- El texto blanco sobre el caramelo `#B68458` no llega a AA en cuerpo pequeño. En el botón (texto grande y semibold) se usa el extremo oscuro del degradado o se oscurece el primario.
