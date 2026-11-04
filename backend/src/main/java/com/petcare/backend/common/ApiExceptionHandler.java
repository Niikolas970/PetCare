package com.petcare.backend.common;

import java.util.LinkedHashMap;
import java.util.Map;

import com.petcare.backend.auth.InvalidCredentialsException;
import com.petcare.backend.auth.TooManyLoginAttemptsException;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(error -> errors.put(error.getField(), error.getDefaultMessage()));

        return ResponseEntity.badRequest().body(Map.of(
                "status", 400,
                "message", "Hay datos inválidos en la solicitud",
                "errors", errors
        ));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadable(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest().body(Map.of(
                "status", 400,
                "message", "El cuerpo de la solicitud no es válido. Revisa el formato y los valores permitidos."
        ));
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(BadRequestException ex) {
        return ResponseEntity.badRequest().body(Map.of(
                "status", 400,
                "message", ex.getMessage()
        ));
    }

    // Parámetros de URL con tipo incorrecto, p. ej. ?from=hoy o /api/pets/abc
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return ResponseEntity.badRequest().body(Map.of(
                "status", 400,
                "message", "El parámetro " + ex.getName() + " tiene un valor inválido"
        ));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "status", 404,
                "message", ex.getMessage()
        ));
    }

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<Map<String, Object>> handleBusinessRule(BusinessRuleException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "status", 409,
                "message", ex.getMessage()
        ));
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidCredentials(InvalidCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "status", 401,
                "message", ex.getMessage()
        ));
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<Map<String, Object>> handleForbidden(ForbiddenException ex) {
        return forbidden(ex.getMessage());
    }

    // Denegaciones de Spring Security dentro de los controladores (p. ej. seguridad por método)
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        return forbidden(ForbiddenException.DEFAULT_MESSAGE);
    }

    private ResponseEntity<Map<String, Object>> forbidden(String message) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "status", 403,
                "message", message
        ));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "status", 409,
                "message", "No se pudo guardar: los datos entran en conflicto con información existente"
        ));
    }

    @ExceptionHandler(TooManyLoginAttemptsException.class)
    public ResponseEntity<Map<String, Object>> handleTooManyAttempts(TooManyLoginAttemptsException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()))
                .body(Map.of(
                        "status", 429,
                        "message", ex.getMessage()
                ));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthentication(AuthenticationException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "status", 401,
                "message", "Debes iniciar sesión para acceder a este recurso"
        ));
    }

    /**
     * Último recurso. Las excepciones estándar de Spring MVC (ruta inexistente, método no permitido,
     * parámetro faltante...) conservan su código HTTP; cualquier otra es un 500.
     * Al cliente nunca se le envía el stack trace ni el mensaje interno: solo queda en el log.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpected(Exception ex, HttpServletRequest request) {
        if (ex instanceof ErrorResponse errorResponse && !errorResponse.getStatusCode().is5xxServerError()) {
            int status = errorResponse.getStatusCode().value();
            return ResponseEntity.status(status)
                    .headers(errorResponse.getHeaders())
                    .body(Map.of(
                            "status", status,
                            "message", messageForStatus(status)
                    ));
        }

        log.error("Error inesperado en {} {}", request.getMethod(), request.getRequestURI(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "status", 500,
                "message", "Ocurrió un error inesperado. Intenta de nuevo más tarde."
        ));
    }

    private static String messageForStatus(int status) {
        return switch (status) {
            case 400 -> "La solicitud no es válida. Revisa los parámetros enviados.";
            case 404 -> "El recurso solicitado no existe";
            case 405 -> "Método HTTP no permitido para esta ruta";
            case 406 -> "El formato de respuesta solicitado no está disponible";
            case 413 -> "La solicitud es demasiado grande";
            case 415 -> "Tipo de contenido no soportado. Envía los datos como application/json.";
            default -> "No se pudo procesar la solicitud";
        };
    }
}