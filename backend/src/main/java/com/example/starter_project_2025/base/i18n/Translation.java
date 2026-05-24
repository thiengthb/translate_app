package com.example.starter_project_2025.base.i18n;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "translations", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"locale", "messageKey"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Translation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 10)
    private String locale;

    @Column(nullable = false, length = 200)
    private String messageKey;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String messageValue;

    @Column(length = 100)
    private String category;
}
