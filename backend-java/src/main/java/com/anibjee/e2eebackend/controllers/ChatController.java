package com.anibjee.e2eebackend.controllers;

import com.anibjee.e2eebackend.models.Message;
import com.anibjee.e2eebackend.repositories.MessageRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final MessageRepository messageRepository;

    public ChatController(SimpMessagingTemplate messagingTemplate, MessageRepository messageRepository) {
        this.messagingTemplate = messagingTemplate;
        this.messageRepository = messageRepository;
    }

    // 1. Create a safe "Buffer" object that accepts the frontend payload without crashing JPA
    public record IncomingPayload(String id, String senderId, String recipientId, String ciphertext) {}

    // 2. Intercept incoming live WS messages and persist them safely
    @MessageMapping("/chat.private")
    public void processMessage(@RequestBody IncomingPayload payload) {
        System.out.println("🚀 1. Payload received from " + payload.senderId() + " targeting " + payload.recipientId());
        
        try {
            // Create a fresh entity
            Message newEntity = new Message(
                payload.senderId(), 
                payload.recipientId(), 
                payload.ciphertext(), 
                LocalDateTime.now()
            );
            
            // Save to PostgreSQL
            Message savedMessage = messageRepository.save(newEntity);
            System.out.println("💾 2. Message saved to DB with new ID: " + savedMessage.getId());

            // BYPASS Spring Security's Principal requirement by manually building the destination string
            String explicitDestination = "/queue/chat/" + savedMessage.getRecipientId();
            messagingTemplate.convertAndSend(explicitDestination, savedMessage);
            
            System.out.println("📫 3. Successfully routed to: " + explicitDestination);

        } catch (Exception e) {
            // If the database or router fails, scream loudly in the terminal
            System.err.println("❌ BACKEND CRASH in processMessage: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // 1. Lightweight payload just for typing events
    public record TypingPayload(String senderId, String recipientId) {}

    // 2. The Ephemeral Router (No database interaction)
    @MessageMapping("/chat.typing")
    public void processTyping(@RequestBody TypingPayload payload) {
        // Send directly to a dedicated 'typing' queue for the recipient
        String destination = "/queue/typing/" + payload.recipientId();
        messagingTemplate.convertAndSend(destination, payload);
    }

    // 2. HTTP Endpoint to serve historical ciphertext
    @GetMapping("/api/v1/messages/history")
    public ResponseEntity<List<Message>> getChatHistory(
            @RequestParam("user1") String user1,
            @RequestParam("user2") String user2) {
        
        if (user1 == null || user2 == null || user1.trim().isEmpty() || user2.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        // Fetch history using case-insensitive handle matching
        List<Message> history = messageRepository.findChatHistory(user1.trim(), user2.trim());
        return ResponseEntity.ok(history);
    }
}
