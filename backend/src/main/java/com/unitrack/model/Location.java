package com.unitrack.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

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

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
