package com.anibjee.e2eebackend.controllers;

import com.anibjee.e2eebackend.models.User;
import com.anibjee.e2eebackend.repositories.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin(origins = "http://localhost:3000")
public class AuthController {

    private final UserRepository userRepository;

    public AuthController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public record RegisterRequest(String username, String publicKey) {}

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody RegisterRequest request) {
        // If user exists, we update the key (for this dev phase)
        User user = userRepository.findByUsername(request.username())
                .orElse(new User());
        
        user.setUsername(request.username());
        user.setPublicKey(request.publicKey());
        user.setLastSeen(LocalDateTime.now());

        return ResponseEntity.ok(userRepository.save(user));
    }

    // NEW: The lookup endpoint for Phase 4
    @GetMapping("/user/{username}/key")
    public ResponseEntity<?> getPublicKey(@PathVariable String username) {
        System.out.println("🔍 Looking up key for user: [" + username + "]"); // 🟢 Add this line
        return userRepository.findByUsername(username)
                .map(user -> ResponseEntity.ok(Map.of("publicKey", user.getPublicKey())))
                .orElse(ResponseEntity.notFound().build());
    }

    // NEW: Directory endpoint for the Sidebar
    @GetMapping("/users")
    public ResponseEntity<List<String>> getAllRegisteredUsers() {
        // Fetch all users, map them to just their usernames, and return as a list
        List<String> usernames = userRepository.findAll().stream()
                .map(User::getUsername)
                .toList(); // Note: If using Java < 16, use .collect(Collectors.toList())
                
        return ResponseEntity.ok(usernames);
    }
}
