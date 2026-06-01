package com.example.starter_project_2025.base.notification;

import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "notifications", indexes = {
        @Index(name = "idx_notif_user", columnList = "userId"),
        @Index(name = "idx_notif_read", columnList = "userId,isRead")
})
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@ResourceMenu(
        title = "Notifications",
        group = "Community",
        icon = "bell",
        url = "/notifications",
        description = "User notification inbox records.",
        order = 3,
        permission = ""
)
public class Notification extends BaseEntity {

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private NotificationType type = NotificationType.INFO;

    @Column(length = 100)
    private String entityName;

    private Long entityId;

    @Column(length = 500)
    private String actionUrl;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isRead = false;

    public enum NotificationType {
        INFO, SUCCESS, WARNING, ERROR, SYSTEM
    }
}
