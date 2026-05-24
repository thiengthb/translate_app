package com.example.starter_project_2025.base.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public void sendToUser(Long userId, Object payload) {
        try {
            messagingTemplate.convertAndSendToUser(
                    userId.toString(),
                    "/queue/notifications",
                    payload
            );
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification to user {}", userId, e);
        }
    }

    public void broadcast(String topic, Object payload) {
        try {
            messagingTemplate.convertAndSend("/topic/" + topic, payload);
        } catch (Exception e) {
            log.error("Failed to broadcast to topic {}", topic, e);
        }
    }

    public void sendEntityUpdate(String entityName, Long entityId, String action, Object payload) {
        try {
            messagingTemplate.convertAndSend(
                    "/topic/entity/" + entityName + "/" + entityId,
                    new EntityUpdateMessage(entityName, entityId, action, payload)
            );
        } catch (Exception e) {
            log.error("Failed to send entity update for {} {}", entityName, entityId, e);
        }
    }

    public record EntityUpdateMessage(String entityName, Long entityId, String action, Object data) {
    }
}
