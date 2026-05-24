package com.example.starter_project_2025.base.notification;

import com.example.starter_project_2025.base.websocket.WebSocketNotificationService;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final WebSocketNotificationService webSocketNotificationService;

    @Transactional
    public Notification create(Long userId, String title, String message,
                                Notification.NotificationType type,
                                String entityName, Long entityId, String actionUrl) {
        Notification notification = Notification.builder()
                .userId(userId)
                .title(title)
                .message(message)
                .type(type)
                .entityName(entityName)
                .entityId(entityId)
                .actionUrl(actionUrl)
                .isRead(false)
                .build();

        Notification saved = notificationRepository.save(notification);

        // Send via WebSocket
        webSocketNotificationService.sendToUser(userId, saved);

        return saved;
    }

    public Page<Notification> getByUser(Long userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    public Page<Notification> getUnread(Long userId, Pageable pageable) {
        return notificationRepository.findByUserIdAndIsReadOrderByCreatedAtDesc(userId, false, pageable);
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsRead(userId, false);
    }

    @Transactional
    public void markAsRead(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        notification.setIsRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsRead(userId);
    }
}
