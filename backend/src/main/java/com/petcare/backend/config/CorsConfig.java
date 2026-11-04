package com.petcare.backend.config;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * CORS para el frontend. Los orígenes salen de petcare.cors.allowed-origins
 * (separados por comas; por defecto http://localhost:5173, el servidor de Vite).
 */
@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${petcare.cors.allowed-origins:http://localhost:5173}") String allowedOrigins) {

        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList();

        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE"));
        // Authorization para el token; Content-Type es necesario para enviar JSON desde el navegador
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        // Permite al frontend leer la URL del recurso creado (201) y la espera tras un 429
        config.setExposedHeaders(List.of("Location", "Retry-After"));
        // El token viaja en el header Authorization, no en cookies
        config.setAllowCredentials(false);
        config.setMaxAge(Duration.ofHours(1));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
