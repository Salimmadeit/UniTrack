package com.unitrack.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "queue_status")
public class QueueStatus {

    @Id
    private Long id;

    @Column(nullable = false, length = 20)
    private String level;

    /**
     * Who reported this level - "DISPATCHER" or "STUDENT".
     */
    @Column(nullable = false, length = 20)
    private String source = "DISPATCHER";

    /** Absolute instant, for the same timezone reason documented on Location. */
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public QueueStatus() {}

    public QueueStatus(Long id, String level, String source, Instant updatedAt) {
        this.id = id;
        this.level = level;
        this.source = source;
        this.updatedAt = updatedAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
