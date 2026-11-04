package com.petcare.backend.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Limita los intentos de login fallidos: máximo 5 por correo en una ventana de 15 minutos.
 *
 * Implementación en memoria (ventana deslizante por correo). Sirve para una sola instancia:
 * se pierde al reiniciar y no se comparte entre servidores. En producción con varias
 * instancias se usaría un almacén compartido como Redis (p. ej. INCR + EXPIRE por clave
 * "login:fallos:{correo}") o el rate limiting del API gateway, idealmente combinado con
 * un límite por IP.
 */
@Service
public class LoginAttemptService {

    static final int MAX_FAILURES = 5;
    static final Duration WINDOW = Duration.ofMinutes(15);

    // Si el mapa crece mucho (p. ej. ataque con muchos correos) se limpian las entradas vencidas
    private static final int CLEANUP_THRESHOLD = 10_000;

    private final Map<String, Deque<Instant>> failures = new ConcurrentHashMap<>();
    private final Clock clock;

    @Autowired
    public LoginAttemptService() {
        this(Clock.systemUTC());
    }

    LoginAttemptService(Clock clock) {
        this.clock = clock;
    }

    /** Lanza TooManyLoginAttemptsException si el correo ya alcanzó el máximo de fallos. */
    public void checkAllowed(String email) {
        Deque<Instant> attempts = failures.get(key(email));
        if (attempts == null) {
            return;
        }
        synchronized (attempts) {
            Instant now = clock.instant();
            prune(attempts, now);
            if (attempts.size() >= MAX_FAILURES) {
                Instant unlockAt = attempts.peekFirst().plus(WINDOW);
                long retryAfter = Math.max(1, Duration.between(now, unlockAt).toSeconds());
                throw new TooManyLoginAttemptsException(retryAfter);
            }
        }
    }

    public void recordFailure(String email) {
        if (failures.size() > CLEANUP_THRESHOLD) {
            removeExpired();
        }
        Deque<Instant> attempts = failures.computeIfAbsent(key(email), k -> new ArrayDeque<>());
        synchronized (attempts) {
            Instant now = clock.instant();
            prune(attempts, now);
            attempts.addLast(now);
        }
    }

    public void recordSuccess(String email) {
        failures.remove(key(email));
    }

    private void prune(Deque<Instant> attempts, Instant now) {
        Instant limit = now.minus(WINDOW);
        while (!attempts.isEmpty() && !attempts.peekFirst().isAfter(limit)) {
            attempts.pollFirst();
        }
    }

    private void removeExpired() {
        Instant now = clock.instant();
        failures.entrySet().removeIf(entry -> {
            synchronized (entry.getValue()) {
                prune(entry.getValue(), now);
                return entry.getValue().isEmpty();
            }
        });
    }

    private static String key(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
