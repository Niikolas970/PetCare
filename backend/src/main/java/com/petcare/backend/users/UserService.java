package com.petcare.backend.users;

import com.petcare.backend.common.ResourceNotFoundException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    static final String USER_NOT_FOUND = "El usuario no existe";

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public UserResponse updateMe(Long userId, UpdateMeRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND));
        user.setFullName(request.fullName().trim());
        return UserResponse.of(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public UserResponse getMe(Long userId) {
        return userRepository.findById(userId)
                .map(UserResponse::of)
                .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND));
    }
}
