package com.anibjee.e2eebackend.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "messages")
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String senderId;

    @Column(nullable = false)
    private String recipientId;

    // Storing ciphertext which can be quite long
    @Column(columnDefinition = "TEXT", nullable = false)
    private String ciphertext;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    // Boilerplate Constructors, Getters, and Setters
    public Message() {}

    public Message(String senderId, String recipientId, String ciphertext, LocalDateTime timestamp) {
        this.senderId = senderId;
        this.recipientId = recipientId;
        this.ciphertext = ciphertext;
        this.timestamp = timestamp;
    }

    public Long getId() { return id; }
    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }
    public String getRecipientId() { return recipientId; }
    public void setRecipientId(String recipientId) { this.recipientId = recipientId; }
    public String getCiphertext() { return ciphertext; }
    public void setCiphertext(String ciphertext) { this.ciphertext = ciphertext; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
