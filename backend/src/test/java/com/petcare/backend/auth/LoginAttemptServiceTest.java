package com.petcare.backend.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.time.Instant;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class LoginAttemptServiceTest {

    private static final String EMAIL = "ana@petcare.test";

    private MutableClock clock;
    private LoginAttemptService service;

    @BeforeEach
    void setUp() {
        clock = new MutableClock(Instant.parse("2026-11-02T15:00:00Z"));
        service = new LoginAttemptService(clock);
    }

    @Test
    @DisplayName("Permite hasta 4 fallos y bloquea al llegar a 5 dentro de la ventana")
    void blocksAfterFiveFailures() {
        for (int i = 0; i < 4; i++) {
            service.recordFailure(EMAIL);
        }
        assertThatCode(() -> service.checkAllowed(EMAIL)).doesNotThrowAnyException();

        service.recordFailure(EMAIL);

        assertThatThrownBy(() -> service.checkAllowed(EMAIL))
                .isInstanceOf(TooManyLoginAttemptsException.class)
                .hasMessage("Demasiados intentos. Intenta de nuevo más tarde.");
    }

    @Test
    void retryAfterPointsToWhenTheOldestFailureExpires() {
        service.recordFailure(EMAIL);
        clock.advance(Duration.ofMinutes(5));
        for (int i = 0; i < 4; i++) {
            service.recordFailure(EMAIL);
        }

        assertThatThrownBy(() -> service.checkAllowed(EMAIL))
                .isInstanceOfSatisfying(TooManyLoginAttemptsException.class,
                        ex -> assertThat(ex.getRetryAfterSeconds()).isEqualTo(Duration.ofMinutes(10).toSeconds()));
    }

    @Test
    @DisplayName("Los fallos vencen a los 15 minutos (ventana deslizante)")
    void failuresExpireAfterTheWindow() {
        for (int i = 0; i < 5; i++) {
            service.recordFailure(EMAIL);
        }
        clock.advance(Duration.ofMinutes(15));

        assertThatCode(() -> service.checkAllowed(EMAIL)).doesNotThrowAnyException();
    }

    @Test
    void successResetsTheCounter() {
        for (int i = 0; i < 4; i++) {
            service.recordFailure(EMAIL);
        }
        service.recordSuccess(EMAIL);
        for (int i = 0; i < 4; i++) {
            service.recordFailure(EMAIL);
        }

        assertThatCode(() -> service.checkAllowed(EMAIL)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("El correo se normaliza: mayúsculas y espacios cuentan como el mismo")
    void emailIsNormalized() {
        for (int i = 0; i < 5; i++) {
            service.recordFailure(i % 2 == 0 ? "  ANA@petcare.test " : EMAIL);
        }

        assertThatThrownBy(() -> service.checkAllowed("Ana@PetCare.test"))
                .isInstanceOf(TooManyLoginAttemptsException.class);
    }

    @Test
    void limitsAreIndependentPerEmail() {
        for (int i = 0; i < 5; i++) {
            service.recordFailure(EMAIL);
        }

        assertThatCode(() -> service.checkAllowed("otro@petcare.test")).doesNotThrowAnyException();
    }
}
