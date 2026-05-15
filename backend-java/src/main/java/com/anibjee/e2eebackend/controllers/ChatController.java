package com.anibjee.e2eebackend.controllers;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;

    public ChatController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    // A lightweight record to hold the routing data and the ciphertext
    public record ChatMessage(String senderId, String recipientId, String ciphertext) {}

    /**
     * Handles 1-on-1 direct messages.
     * Clients send to: /app/chat.private
     */
    @MessageMapping("/chat.private")
    public void routePrivateMessage(@Payload ChatMessage message) {
        // The server does NOT decrypt the ciphertext. It blindly routes it.
        // It sends the payload to: /user/{recipientId}/queue/messages
        messagingTemplate.convertAndSendToUser(
                message.recipientId(), 
                "/queue/messages", 
                message
        );
        
        System.out.println("Routed ciphertext from " + message.senderId() + " to " + message.recipientId());
    }
}
