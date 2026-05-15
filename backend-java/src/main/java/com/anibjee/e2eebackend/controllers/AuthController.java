package com.anibjee.e2eebackend.controllers;

import com.anibjee.e2eebackend.models.User;
import com.anibjee.e2eebackend.repositories.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final UserRepository userRepository;

    public AuthController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // Java 21 Record for clean data transfer
    public record RegisterRequest(String username, String publicKey) {}

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody RegisterRequest request) {
        if (userRepository.findByUsername(request.username()).isPresent()) {
            return ResponseEntity.badRequest().body("Username already taken.");
        }

        User newUser = new User();
        newUser.setUsername(request.username());
        newUser.setPublicKey(request.publicKey());
        newUser.setLastSeen(LocalDateTime.now());

        User savedUser = userRepository.save(newUser);
        
        return ResponseEntity.ok(savedUser);
    }
}
