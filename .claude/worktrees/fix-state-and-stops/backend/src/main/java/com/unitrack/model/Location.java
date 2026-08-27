package com.unitrack.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Entity
@Table(name = "location")
@Data
@NoArgsConstructor
public class Location {

    @Id
    private Long id;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(nullable = false)
    private Double speed = 0.0;

    @Column(nullable = false)
    private Double heading = 0.0;

    /**
     * The moment this reading was recorded, as an absolute instant.
     *
     * Deliberately an Instant and not a LocalDateTime. A LocalDateTime carries
     * no zone, so Jackson serialises it as "2026-08-26T14:00:00" with no offset.
     * The container runs in UTC while phones on campus are in UTC+1, and a
     * browser parses an offset-less datetime as *local* time - which made every
     * fresh ping read as exactly one hour old and pinned the student view to
     * DISCONNECTED. An Instant always serialises with a trailing Z, so there is
     * nothing left for either side to guess.
     */
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
