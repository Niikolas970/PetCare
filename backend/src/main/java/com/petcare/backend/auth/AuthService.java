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

    // Hash de relleno (Argon2id): si el correo no existe igual se verifica una contraseña,
    // así el tiempo de respuesta no delata qué correos están registrados
    private final String dummyPasswordHash;

    public AuthService(UserRepository userRepository,
                       HouseholdRepository householdRepository,
                       HouseholdMemberRepository householdMemberRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.householdRepository = householdRepository;
        this.householdMemberRepository = householdMemberRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
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
        household.setName("Hogar de " + fullName);
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

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(normalizeEmail(request.email())).orElse(null);

        // Mismo error en todos los casos para no revelar si el correo existe
        if (user == null) {
            passwordEncoder.matches(request.password(), dummyPasswordHash);
            throw new InvalidCredentialsException();
        }

        boolean passwordMatches = passwordEncoder.matches(request.password(), user.getPasswordHash());
        if (!passwordMatches || user.getStatus() != UserStatus.ACTIVE) {
            throw new InvalidCredentialsException();
        }

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
