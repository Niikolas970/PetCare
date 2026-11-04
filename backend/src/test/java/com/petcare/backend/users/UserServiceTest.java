package com.petcare.backend.users;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.util.Optional;

import com.petcare.backend.common.ResourceNotFoundException;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepository;
    @InjectMocks private UserService service;

    @Test
    @DisplayName("Editar mi nombre lo guarda sin espacios sobrantes y no expone la contraseña")
    void updateMeTrimsTheName() {
        User user = new User();
        user.setId(1L);
        user.setFullName("Ana");
        user.setEmail("ana@petcare.test");
        user.setPasswordHash("{argon2}secreto");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UserResponse response = service.updateMe(1L, new UpdateMeRequest("  Ana María Gómez  "));

        assertThat(response.fullName()).isEqualTo("Ana María Gómez");
        assertThat(response.email()).isEqualTo("ana@petcare.test");
        assertThat(response.toString()).doesNotContain("argon2");
    }

    @Test
    void updateMeOfMissingUserIsNotFound() {
        when(userRepository.findById(9L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateMe(9L, new UpdateMeRequest("Ana"))).isInstanceOf(ResourceNotFoundException.class);
    }
}
