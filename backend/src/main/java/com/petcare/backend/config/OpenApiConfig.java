package com.petcare.backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Documentación OpenAPI. Swagger UI: /swagger-ui.html (solo si petcare.docs.enabled=true).
 */
@Configuration
public class OpenApiConfig {

    public static final String BEARER_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI petCareOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("PetCare API")
                        .version("1.0")
                        .description("""
                                API para gestionar el cuidado de mascotas en un hogar compartido: \
                                mascotas, miembros e invitaciones, historial clínico, registros diarios, \
                                tareas de cuidado, panel del hogar y línea de tiempo.

                                **Autenticación:** registra un usuario en `POST /api/auth/register`, inicia sesión en \
                                `POST /api/auth/login` y pulsa **Authorize** para pegar el `accessToken` (sin "Bearer ").

                                Los recursos de hogares ajenos responden 404 para no revelar que existen."""))
                .components(new Components()
                        .addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Token JWT obtenido en /api/auth/login")))
                // Por defecto todas las operaciones piden token; las públicas lo anulan con @SecurityRequirements
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME));
    }
}
