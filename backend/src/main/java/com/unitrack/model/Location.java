package com.unitrack.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "location")
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

    @Column(name = "shuttle_id")
    private String shuttleId = "BUS-01";

    @Column(name = "route_id")
    private String routeId = "ROUTE-01";

    @Column(name = "status")
    private String status = "EN_ROUTE";

    @Column(name = "battery_level")
    private Integer batteryLevel = 90;

    /**
     * The moment this reading was recorded, as an absolute instant.
     */
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Location() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Double getSpeed() { return speed; }
    public void setSpeed(Double speed) { this.speed = speed; }

    public Double getHeading() { return heading; }
    public void setHeading(Double heading) { this.heading = heading; }

    public String getShuttleId() { return shuttleId; }
    public void setShuttleId(String shuttleId) { this.shuttleId = shuttleId; }

    public String getRouteId() { return routeId; }
    public void setRouteId(String routeId) { this.routeId = routeId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getBatteryLevel() { return batteryLevel; }
    public void setBatteryLevel(Integer batteryLevel) { this.batteryLevel = batteryLevel; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
