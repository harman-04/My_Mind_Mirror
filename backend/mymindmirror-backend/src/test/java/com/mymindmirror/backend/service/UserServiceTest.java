package com.mymindmirror.backend.service;

import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    @Test
    void registerNewUser_ShouldSaveAndReturnUser() {
        String username = "newuser";
        String email = "new@example.com";
        String password = "password";
        when(userRepository.existsByUsername(username)).thenReturn(false);
        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());
        when(passwordEncoder.encode(password)).thenReturn("encoded");
        User savedUser = new User();
        savedUser.setId(UUID.randomUUID());
        savedUser.setUsername(username);
        savedUser.setEmail(email);
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        User result = userService.registerNewUser(username, email, password);

        assertThat(result.getUsername()).isEqualTo(username);
        verify(userRepository).save(any(User.class));
    }

    @Test
    void registerNewUser_WhenUsernameExists_ShouldThrowException() {
        when(userRepository.existsByUsername("existing")).thenReturn(true);
        assertThatThrownBy(() -> userService.registerNewUser("existing", "e@x.com", "pass"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Username already exists");
        verify(userRepository, never()).save(any());
    }
}