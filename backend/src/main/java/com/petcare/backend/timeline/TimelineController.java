package com.petcare.backend.timeline;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.util.List;

import com.petcare.backend.common.CurrentUser;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Línea de tiempo", description = "Historia unificada de una mascota")
public class TimelineController {

    private final TimelineService timelineService;
    private final CurrentUser currentUser;

    public TimelineController(TimelineService timelineService, CurrentUser currentUser) {
        this.timelineService = timelineService;
        this.currentUser = currentUser;
    }

    // Ejemplo: /api/pets/5/timeline?from=2026-01-01&to=2026-12-31&types=VACCINE,TASK
    @Operation(summary = "Línea de tiempo de la mascota", description = "Filtros opcionales ?from=&to= (AAAA-MM-DD) y ?types=VACCINE,TASK,...")
    @GetMapping("/api/pets/{petId}/timeline")
    public List<TimelineItem> timeline(@PathVariable Long petId,
                                       @RequestParam(required = false)
                                       @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                       @RequestParam(required = false)
                                       @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                       @RequestParam(required = false) String types) {
        return timelineService.timeline(petId, currentUser.id(), from, to, types);
    }
}
