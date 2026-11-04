package com.petcare.backend.common;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Convierte parámetros de consulta en enums sin distinguir mayúsculas,
 * con un error 400 en español si el valor no es válido.
 */
public final class EnumParams {

    private EnumParams() {
    }

    public static <E extends Enum<E>> E parse(Class<E> type, String value, String paramName) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Enum.valueOf(type, value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("El parámetro " + paramName + " no es válido: '" + value.trim()
                    + "'. Valores permitidos: " + allowed(type));
        }
    }

    // Lista separada por comas ("VACCINE,TASK"). Vacía o nula → todos los valores
    public static <E extends Enum<E>> Set<E> parseList(Class<E> type, String value, String paramName) {
        if (value == null || value.isBlank()) {
            return EnumSet.allOf(type);
        }
        Set<E> result = EnumSet.noneOf(type);
        for (String part : value.split(",")) {
            E parsed = parse(type, part, paramName);
            if (parsed != null) {
                result.add(parsed);
            }
        }
        return result.isEmpty() ? EnumSet.allOf(type) : result;
    }

    private static <E extends Enum<E>> String allowed(Class<E> type) {
        return Arrays.stream(type.getEnumConstants()).map(Enum::name).collect(Collectors.joining(", "));
    }
}
