package com.petcare.backend.health;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import java.time.LocalDateTime;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Estado", description = "Verificación pública del backend")
// Endpoints públicos: sin candado en Swagger
@SecurityRequirements
@RequestMapping("/api")
public class HealthController {

    private final JdbcTemplate jdbcTemplate;

    public HealthController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // Endpoint público: solo informa si el backend y la base responden, sin datos internos
    @Operation(summary = "Estado del backend", description = "Indica si el backend y la base de datos responden.")
    @GetMapping("/health")
    public Map<String, Object> health() {
        jdbcTemplate.queryForObject("SELECT 1", Integer.class);

        return Map.of(
                "status", "UP",
                "timestamp", LocalDateTime.now().toString()
        );
    }
}
