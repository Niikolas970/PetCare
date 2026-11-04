package com.petcare.backend.users;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.petcare.backend.common.CurrentUser;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Usuarios", description = "Datos del usuario autenticado")
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final CurrentUser currentUser;

    public UserController(UserService userService, CurrentUser currentUser) {
        this.userService = userService;
        this.currentUser = currentUser;
    }

    @Operation(summary = "Ver mi usuario", description = "id, nombre completo y correo del usuario del token. Nunca incluye la contraseña.")
    @GetMapping("/me")
    public UserResponse me() {
        return userService.getMe(currentUser.id());
    }

    @Operation(summary = "Editar mi nombre", description = "Solo fullName. El correo no se cambia.")
    @PutMapping("/me")
    public UserResponse updateMe(@Valid @RequestBody UpdateMeRequest request) {
        return userService.updateMe(currentUser.id(), request);
    }
}
