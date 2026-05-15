package com.anibjee.e2eebackend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // "/topic" is for group broadcasts. "/queue" is for private 1-on-1 messages.
        config.enableSimpleBroker("/topic", "/queue");
        // Messages sent FROM the client TO the server must start with "/app"
        config.setApplicationDestinationPrefixes("/app");
        // Required to route messages to specific UUIDs
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // This is the exact URL the React Native frontend will connect to
        registry.addEndpoint("/ws-chat")
                .setAllowedOriginPatterns("*") // Allows cross-origin requests for testing
                .withSockJS(); // Fallback for browsers that don't support native WebSockets
    }
}
