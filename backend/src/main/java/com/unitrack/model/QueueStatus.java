package com.unitrack.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Entity
@Table(name = "queue_status")
@Data
@NoArgsConstructor
public class QueueStatus {

    @Id
    private Long id;

    @Column(nullable = false, length = 20)
    private String level;

    /**
     * Who reported this level - "DISPATCHER" or "STUDENT".
     *
     * Students and dispatchers both report crowding, but the two are not equally
     * authoritative: a dispatcher is standing at the stop counting, a student is
     * one person's impression. Recording the origin lets the UI say where a
     * number came from, and leaves room to weight them differently later without
     * a schema change.
     */
    @Column(nullable = false, length = 20)
    private String source = "DISPATCHER";

    /** Absolute instant, for the same timezone reason documented on Location. */
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
