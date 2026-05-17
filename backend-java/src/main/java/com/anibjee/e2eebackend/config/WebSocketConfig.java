package com.anibjee.e2eebackend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;

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

    // 1. Upgrade the STOMP message transport frame boundaries
    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration.setMessageSizeLimit(64 * 1024 * 1024);     // Boost to 64MB
        registration.setSendBufferSizeLimit(64 * 1024 * 1024);  // Boost to 64MB
        registration.setSendTimeLimit(30 * 1000);                // 30 Seconds window
    }

    // 2. Upgrade the underlying Tomcat Engine Buffers (Crucial for Base64 streams)
    @Bean
    public ServletServerContainerFactoryBean createWebSocketContainer() {
        ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean();
        container.setMaxTextMessageBufferSize(64 * 1024 * 1024);   // 64MB Buffer
        container.setMaxBinaryMessageBufferSize(64 * 1024 * 1024); // 64MB Buffer
        return container;
    }
}
