package com.anibjee.e2eebackend.repositories;

import com.anibjee.e2eebackend.models.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query("SELECT m FROM Message m WHERE " +
           "(m.senderId = :user1 AND m.recipientId = :user2) OR " +
           "(m.senderId = :user2 AND m.recipientId = :user1) " +
           "ORDER BY m.timestamp ASC")
    List<Message> findChatHistory(@Param("user1") String user1, @Param("user2") String user2);
}
