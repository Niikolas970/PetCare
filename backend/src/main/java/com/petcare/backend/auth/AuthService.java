package com.petcare.backend.auth;

import java.time.LocalDateTime;
import java.util.Locale;

import com.petcare.backend.common.BusinessRuleException;
import com.petcare.backend.households.Household;
import com.petcare.backend.households.HouseholdMember;
import com.petcare.backend.households.HouseholdMemberRepository;
import com.petcare.backend.households.HouseholdRepository;
import com.petcare.backend.households.MemberRole;
import com.petcare.backend.households.MemberStatus;
import com.petcare.backend.users.User;
import com.petcare.backend.users.UserRepository;
import com.petcare.backend.users.UserStatus;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final HouseholdRepository householdRepository;
    private final HouseholdMemberRepository householdMemberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LoginAttemptService loginAttemptService;

    // Hash de relleno (Argon2id): si el correo no existe igual se verifica una contraseña,
    // así el tiempo de respuesta no delata qué correos están registrados
    private final String dummyPasswordHash;

    public AuthService(UserRepository userRepository,
                       HouseholdRepository householdRepository,
                       HouseholdMemberRepository householdMemberRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       LoginAttemptService loginAttemptService) {
        this.userRepository = userRepository;
        this.householdRepository = householdRepository;
        this.householdMemberRepository = householdMemberRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.loginAttemptService = loginAttemptService;
        this.dummyPasswordHash = passwordEncoder.encode("petcare-dummy-password");
    }

    @Transactional
    public RegisteredUserResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());

        if (userRepository.existsByEmail(email)) {
            throw new BusinessRuleException("Ya existe una cuenta con ese correo");
        }

        String fullName = request.fullName().trim();

        User user = new User();
        user.setFullName(fullName);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setStatus(UserStatus.ACTIVE);
        user = userRepository.save(user);

        Household household = new Household();
        household.setName(defaultHouseholdName(fullName));
        household = householdRepository.save(household);

        HouseholdMember member = new HouseholdMember();
        member.setHouseholdId(household.getId());
        member.setUserId(user.getId());
        member.setRole(MemberRole.OWNER);
        member.setStatus(MemberStatus.ACTIVE);
        member.setJoinedAt(LocalDateTime.now());
        householdMemberRepository.save(member);

        return new RegisteredUserResponse(user.getId(), user.getFullName(), user.getEmail(), household.getId());
    }

    // Columna households.name: VARCHAR(120)
    static final int HOUSEHOLD_NAME_MAX = 120;

    /**
     * "Hogar de <primer nombre>". Solo se usa al registrarse; los hogares existentes no cambian.
     * Se recorta a la longitud de la columna para nombres muy largos.
     */
    static String defaultHouseholdName(String fullName) {
        String firstName = fullName.trim().split("\\s+")[0];
        String name = "Hogar de " + firstName;
        return name.length() <= HOUSEHOLD_NAME_MAX ? name : name.substring(0, HOUSEHOLD_NAME_MAX);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());

        // Se revisa antes de verificar la contraseña: bloqueado, ni la contraseña correcta entra
        loginAttemptService.checkAllowed(email);

        User user = userRepository.findByEmail(email).orElse(null);

        // Mismo error en todos los casos para no revelar si el correo existe.
        // Los correos inexistentes también cuentan como fallo (si no, el límite delataría cuáles existen).
        if (user == null) {
            passwordEncoder.matches(request.password(), dummyPasswordHash);
            loginAttemptService.recordFailure(email);
            throw new InvalidCredentialsException();
        }

        boolean passwordMatches = passwordEncoder.matches(request.password(), user.getPasswordHash());
        if (!passwordMatches || user.getStatus() != UserStatus.ACTIVE) {
            loginAttemptService.recordFailure(email);
            throw new InvalidCredentialsException();
        }

        loginAttemptService.recordSuccess(email);

        // Rehash on login: solo aquí conocemos la contraseña en texto plano y ya está verificada.
        // Convierte hashes BCrypt antiguos (o Argon2 con parámetros viejos) al algoritmo actual.
        if (passwordEncoder.upgradeEncoding(user.getPasswordHash())) {
            user.setPasswordHash(passwordEncoder.encode(request.password()));
            userRepository.save(user);
        }

        return AuthResponse.bearer(jwtService.generateToken(user), jwtService.getExpiresInSeconds());
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
