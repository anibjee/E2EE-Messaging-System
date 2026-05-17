package com.anibjee.e2eebackend.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "messages")
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 1. Relational Foreign Key columns pointing to User UUID primary keys
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_fk_id") 
    @JsonIgnore
    private User sender;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_fk_id")
    @JsonIgnore
    private User recipient;

    // 2. 🟢 FIX: Explicitly name the text handle columns to prevent naming collisions
    @Column(name = "sender_handle", nullable = false)
    private String senderId;    // Stays 'senderId' for incoming frontend JSON payloads

    @Column(name = "recipient_handle", nullable = false)
    private String recipientId; // Stays 'recipientId' for incoming frontend JSON payloads

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

    public User getSender() { return sender; }
    public void setSender(User sender) { this.sender = sender; }
    public User getRecipient() { return recipient; }
    public void setRecipient(User recipient) { this.recipient = recipient; }
}
