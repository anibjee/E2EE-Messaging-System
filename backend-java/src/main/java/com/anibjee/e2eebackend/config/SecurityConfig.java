package com.anibjee.e2eebackend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // 1. Disable Cross-Site Request Forgery (CSRF) for development REST endpoints
            .csrf(AbstractHttpConfigurer::disable)
            
            // 2. Allow your global CorsConfig to dictate origin validation access rules
            .cors(cors -> {})
            
            // 3. 🔓 THE PUBLIC GATEWAY: Explicitly permit all chat and websocket traffic 
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/**", "/ws-chat/**").permitAll()
                .anyRequest().permitAll()
            );

        return http.build();
    }
}
