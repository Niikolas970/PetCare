package com.petcare.backend.timeline;

import java.time.LocalDateTime;

/**
 * Elemento de la línea de tiempo o del registro de actividad.
 * En la línea de tiempo, date es la fecha del evento; en la actividad del hogar, cuándo se registró.
 * createdBy es el nombre de quien lo registró.
 */
public record TimelineItem(
        TimelineType type,
        Long id,
        Long petId,
        String petName,
        LocalDateTime date,
        String title,
        String summary,
        String createdBy
) {
}
