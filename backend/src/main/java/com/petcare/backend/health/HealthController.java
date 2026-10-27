package com.petcare.backend.health;

import java.time.LocalDateTime;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HealthController {

    private final JdbcTemplate jdbcTemplate;


    public HealthController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        String database = jdbcTemplate.queryForObject("SELECT DATABASE()", String.class);
        Integer petsCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM pets", Integer.class);
        Integer usersCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM users", Integer.class);

        return Map.of(
                "status", "UP",
                "database", database,
                "petsCount", petsCount,
                "usersCount",usersCount,
                "timestamp", LocalDateTime.now().toString()
        );
    }
}