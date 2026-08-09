package com.unitrack.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "queue_status")
@Data
@NoArgsConstructor
public class QueueStatus {

    @Id
    private Long id;

    @Column(nullable = false, length = 20)
    private String level;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
