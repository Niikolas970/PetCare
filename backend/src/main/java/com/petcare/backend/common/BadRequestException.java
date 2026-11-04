package com.petcare.backend.common;

// Parámetros o datos inválidos que no se pueden expresar con anotaciones de validación (400)
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }
}
