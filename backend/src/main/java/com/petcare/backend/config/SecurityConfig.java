package com.petcare.backend.config;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import com.nimbusds.jose.jwk.source.ImmutableSecret;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;

@Configuration
public class SecurityConfig {

    private static final int MIN_SECRET_BYTES = 32;

    private static final String PASSWORD_ENCODER_ID = "argon2";

    private static final String UNAUTHORIZED_BODY =
            "{\"status\":401,\"message\":\"Debes iniciar sesión para acceder a este recurso\"}";

    private static final String FORBIDDEN_BODY =
            "{\"status\":403,\"message\":\"No tienes permisos para realizar esta acción\"}";

    private static final String[] DOCS_PATHS = {"/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**"};

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   @Value("${petcare.docs.enabled:false}") boolean docsEnabled)
            throws Exception {
        http
                // API con tokens Bearer: no hay cookies de sesión que un sitio externo pueda reutilizar
                .csrf(csrf -> csrf.disable())
                // Usa el bean corsConfigurationSource de CorsConfig (responde también a los preflight OPTIONS)
                .cors(Customizer.withDefaults())
                // Headers de seguridad. Por defecto Spring Security ya envía X-Content-Type-Options: nosniff,
                // X-Frame-Options: DENY, Cache-Control: no-store, HSTS (solo en HTTPS) y X-XSS-Protection: 0.
                // Se agregan Referrer-Policy y CSP frame-ancestors 'none' (equivalente moderno de X-Frame-Options).
                // La CSP solo restringe el enmarcado para no romper Swagger UI en desarrollo.
                .headers(headers -> headers
                        .referrerPolicy(referrer -> referrer.policy(ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                        .contentSecurityPolicy(csp -> csp.policyDirectives("frame-ancestors 'none'")))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> {
                    auth.requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login").permitAll()
                            .requestMatchers(HttpMethod.GET, "/api/health").permitAll()
                            // Spring reenvía aquí los errores internos; si no es público se verían como 401
                            .requestMatchers("/error").permitAll();
                    // Swagger solo es público si la documentación está habilitada (en prod está apagada)
                    if (docsEnabled) {
                        auth.requestMatchers(DOCS_PATHS).permitAll();
                    }
                    auth.anyRequest().authenticated();
                })
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> { })
                        .authenticationEntryPoint(unauthorizedEntryPoint()))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(unauthorizedEntryPoint())
                        .accessDeniedHandler(forbiddenHandler()));

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();

        Map<String, PasswordEncoder> encoders = new HashMap<>();
        encoders.put(PASSWORD_ENCODER_ID, Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8());
        encoders.put("bcrypt", bcrypt);

        // Los hashes nuevos se guardan como "{argon2}$argon2id$..."
        DelegatingPasswordEncoder delegating = new DelegatingPasswordEncoder(PASSWORD_ENCODER_ID, encoders);
        // Los hashes antiguos de la base no tienen prefijo ("$2a$..."): se validan con BCrypt
        delegating.setDefaultPasswordEncoderForMatches(bcrypt);
        return delegating;
    }

    @Bean
    public SecretKey jwtSecretKey(@Value("${petcare.jwt.secret}") String base64Secret) {
        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(base64Secret.trim());
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException(
                    "JWT_SECRET no es un texto Base64 válido. Genera uno con al menos "
                            + MIN_SECRET_BYTES + " bytes aleatorios.", ex);
        }

        if (keyBytes.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "JWT_SECRET es demasiado corta: tiene " + keyBytes.length + " bytes y HS256 necesita al menos "
                            + MIN_SECRET_BYTES + ". Genera una clave Base64 de " + MIN_SECRET_BYTES + " bytes o más.");
        }

        return new SecretKeySpec(keyBytes, "HmacSHA256");
    }

    @Bean
    public JwtEncoder jwtEncoder(SecretKey jwtSecretKey) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(jwtSecretKey));
    }

    @Bean
    public JwtDecoder jwtDecoder(SecretKey jwtSecretKey) {
        return NimbusJwtDecoder.withSecretKey(jwtSecretKey)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
    }

    // Denegaciones en la cadena de filtros (antes de llegar al controlador): 403 en JSON
    private AccessDeniedHandler forbiddenHandler() {
        return (request, response, accessDeniedException) -> {
            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.getWriter().write(FORBIDDEN_BODY);
        };
    }

    private AuthenticationEntryPoint unauthorizedEntryPoint() {
        return (request, response, authException) -> {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setHeader("WWW-Authenticate", "Bearer");
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.getWriter().write(UNAUTHORIZED_BODY);
        };
    }
}
