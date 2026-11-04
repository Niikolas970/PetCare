package com.petcare.backend.common;

public class ForbiddenException extends RuntimeException {

    public static final String DEFAULT_MESSAGE = "No tienes permisos para realizar esta acción";

    public ForbiddenException() {
        super(DEFAULT_MESSAGE);
    }
}
