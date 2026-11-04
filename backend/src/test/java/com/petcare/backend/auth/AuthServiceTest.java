package com.petcare.backend.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;

import com.petcare.backend.households.HouseholdMemberRepository;
import com.petcare.backend.households.HouseholdRepository;
import com.petcare.backend.users.User;
import com.petcare.backend.users.UserRepository;
import com.petcare.backend.users.UserStatus;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private static final String EMAIL = "ana@petcare.test";
    private static final String PASSWORD = "ClaveSegura123!";
    private static final String DUMMY_HASH = "{argon2}dummy";
    private static final String GENERIC_MESSAGE = "Correo o contraseña incorrectos";

    @Mock
    private UserRepository userRepository;
    @Mock
    private HouseholdRepository householdRepository;
    @Mock
    private HouseholdMemberRepository householdMemberRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;

    private LoginAttemptService loginAttemptService;
    private AuthService service;

    @BeforeEach
    void setUp() {
        when(passwordEncoder.encode("petcare-dummy-password")).thenReturn(DUMMY_HASH);
        lenient().when(jwtService.generateToken(any())).thenReturn("jwt-token");
        lenient().when(jwtService.getExpiresInSeconds()).thenReturn(3600L);

        loginAttemptService = new LoginAttemptService(new MutableClock(Instant.parse("2026-11-02T15:00:00Z")));
        service = new AuthService(userRepository, householdRepository, householdMemberRepository,
                passwordEncoder, jwtService, loginAttemptService);
    }

    @Test
    @DisplayName("Correo inexistente: mensaje genérico y se verifica igual una contraseña (tiempo similar)")
    void unknownEmailGetsGenericErrorAndDummyCheck() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.login(new LoginRequest(EMAIL, PASSWORD)))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage(GENERIC_MESSAGE);
        verify(passwordEncoder).matches(PASSWORD, DUMMY_HASH);
        verify(jwtService, never()).generateToken(any());
    }

    @Test
    @DisplayName("Contraseña incorrecta: el mismo mensaje que con un correo inexistente")
    void wrongPasswordGetsTheSameGenericError() {
        User user = user(UserStatus.ACTIVE, "{argon2}real");
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("otra", "{argon2}real")).thenReturn(false);

        assertThatThrownBy(() -> service.login(new LoginRequest(EMAIL, "otra")))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage(GENERIC_MESSAGE);
    }

    @Test
    @DisplayName("Usuario inactivo con contraseña correcta: también mensaje genérico")
    void inactiveUserGetsTheSameGenericError() {
        User user = user(UserStatus.INACTIVE, "{argon2}real");
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(PASSWORD, "{argon2}real")).thenReturn(true);

        assertThatThrownBy(() -> service.login(new LoginRequest(EMAIL, PASSWORD)))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage(GENERIC_MESSAGE);
    }

    @Test
    void emailIsNormalizedBeforeLookup() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.login(new LoginRequest("  Ana@PetCare.TEST ", PASSWORD)))
                .isInstanceOf(InvalidCredentialsException.class);
        verify(userRepository).findByEmail(EMAIL);
    }

    @Test
    @DisplayName("Rehash: un hash antiguo (BCrypt) se reemplaza por Argon2id al iniciar sesión")
    void legacyHashIsUpgradedOnLogin() {
        User user = user(UserStatus.ACTIVE, "$2a$10$legacy");
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(PASSWORD, "$2a$10$legacy")).thenReturn(true);
        when(passwordEncoder.upgradeEncoding("$2a$10$legacy")).thenReturn(true);
        when(passwordEncoder.encode(PASSWORD)).thenReturn("{argon2}nuevo");

        AuthResponse response = service.login(new LoginRequest(EMAIL, PASSWORD));

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertThat(saved.getValue().getPasswordHash()).isEqualTo("{argon2}nuevo");
        assertThat(response.accessToken()).isEqualTo("jwt-token");
        assertThat(response.tokenType()).isEqualTo("Bearer");
    }

    @Test
    void currentHashIsNotRehashed() {
        User user = user(UserStatus.ACTIVE, "{argon2}actual");
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(PASSWORD, "{argon2}actual")).thenReturn(true);
        when(passwordEncoder.upgradeEncoding("{argon2}actual")).thenReturn(false);

        service.login(new LoginRequest(EMAIL, PASSWORD));

        verify(userRepository, never()).save(any());
        assertThat(user.getPasswordHash()).isEqualTo("{argon2}actual");
    }

    @Test
    @DisplayName("Tras 5 fallos el sexto intento da 429, aunque la contraseña sea correcta")
    void sixthAttemptIsBlockedEvenWithTheRightPassword() {
        User user = user(UserStatus.ACTIVE, "{argon2}real");
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("mala", "{argon2}real")).thenReturn(false);

        for (int i = 0; i < 5; i++) {
            assertThatThrownBy(() -> service.login(new LoginRequest(EMAIL, "mala")))
                    .isInstanceOf(InvalidCredentialsException.class);
        }
        clearInvocations(userRepository, passwordEncoder);

        assertThatThrownBy(() -> service.login(new LoginRequest(EMAIL, PASSWORD)))
                .isInstanceOf(TooManyLoginAttemptsException.class)
                .hasMessage("Demasiados intentos. Intenta de nuevo más tarde.");
        // Bloqueado antes de tocar la base o verificar la contraseña
        verify(userRepository, never()).findByEmail(any());
        verify(passwordEncoder, never()).matches(any(), any());
    }

    @Test
    @DisplayName("Los correos inexistentes también cuentan para el límite")
    void unknownEmailsAreAlsoRateLimited() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());

        for (int i = 0; i < 5; i++) {
            assertThatThrownBy(() -> service.login(new LoginRequest(EMAIL, PASSWORD)))
                    .isInstanceOf(InvalidCredentialsException.class);
        }

        assertThatThrownBy(() -> service.login(new LoginRequest(EMAIL, PASSWORD)))
                .isInstanceOf(TooManyLoginAttemptsException.class);
    }

    @Test
    void successfulLoginResetsTheFailureCounter() {
        User user = user(UserStatus.ACTIVE, "{argon2}real");
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("mala", "{argon2}real")).thenReturn(false);
        when(passwordEncoder.matches(PASSWORD, "{argon2}real")).thenReturn(true);

        for (int i = 0; i < 4; i++) {
            assertThatThrownBy(() -> service.login(new LoginRequest(EMAIL, "mala")))
                    .isInstanceOf(InvalidCredentialsException.class);
        }
        service.login(new LoginRequest(EMAIL, PASSWORD));
        for (int i = 0; i < 4; i++) {
            assertThatThrownBy(() -> service.login(new LoginRequest(EMAIL, "mala")))
                    .isInstanceOf(InvalidCredentialsException.class);
        }

        assertThat(service.login(new LoginRequest(EMAIL, PASSWORD)).accessToken()).isEqualTo("jwt-token");
    }

    private static User user(UserStatus status, String hash) {
        User user = new User();
        user.setId(1L);
        user.setFullName("Ana");
        user.setEmail(EMAIL);
        user.setPasswordHash(hash);
        user.setStatus(status);
        return user;
    }

    @Test
    @DisplayName("El hogar automático usa solo el primer nombre")
    void defaultHouseholdNameUsesFirstName() {
        assertThat(AuthService.defaultHouseholdName("  Laura   Gómez Rincón ")).isEqualTo("Hogar de Laura");
        assertThat(AuthService.defaultHouseholdName("Ana")).isEqualTo("Hogar de Ana");
    }

    @Test
    @DisplayName("Un primer nombre muy largo se recorta a la longitud de la columna (120)")
    void defaultHouseholdNameFitsTheColumn() {
        String longName = "A".repeat(120);
        assertThat(AuthService.defaultHouseholdName(longName)).hasSize(AuthService.HOUSEHOLD_NAME_MAX).startsWith("Hogar de A");
    }
}
