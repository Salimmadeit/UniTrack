package com.unitrack.service;

import com.unitrack.dto.LocationDTO;
import com.unitrack.dto.LocationResponse;
import com.unitrack.model.Location;
import com.unitrack.repository.LocationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

@Service
public class LocationService {

    private final LocationRepository locationRepository;

    @Autowired
    public LocationService(LocationRepository locationRepository) {
        this.locationRepository = locationRepository;
    }

    /**
     * Upserts the single broadcasting driver's position.
     *
     * <p>The MVP supports exactly one driver, so this deliberately overwrites row
     * id=1 rather than appending. Appending would grow the table without bound -
     * one row every 6 seconds, forever - for no gain, since nothing reads the
     * history.
     */
    public Location updateLocation(LocationDTO dto) {
        Location location = locationRepository.findById(1L).orElse(new Location());
        location.setId(1L);
        location.setLatitude(dto.getLatitude());
        location.setLongitude(dto.getLongitude());
        location.setSpeed(dto.getSpeed() != null ? dto.getSpeed() : 0.0);
        location.setHeading(dto.getHeading() != null ? dto.getHeading() : 0.0);
        if (dto.getShuttleId() != null && !dto.getShuttleId().isBlank()) {
            location.setShuttleId(dto.getShuttleId());
        }
        if (dto.getRouteId() != null && !dto.getRouteId().isBlank()) {
            location.setRouteId(dto.getRouteId());
        }
        if (dto.getStatus() != null && !dto.getStatus().isBlank()) {
            location.setStatus(dto.getStatus());
        }
        if (dto.getBatteryLevel() != null) {
            location.setBatteryLevel(dto.getBatteryLevel());
        }
        location.setUpdatedAt(Instant.now());

        return locationRepository.save(location);
    }

    public Optional<Location> getLatestLocation() {
        return locationRepository.findById(1L);
    }

    public java.util.List<LocationResponse> getAllLocations() {
        return locationRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Wraps a stored reading in the public response shape, stamping it with the
     * server's clock.
     */
    public LocationResponse toResponse(Location location) {
        Instant now = Instant.now();
        Instant updatedAt = location.getUpdatedAt();

        long ageSeconds = updatedAt == null
                ? Long.MAX_VALUE
                : Math.max(0, Duration.between(updatedAt, now).getSeconds());

        String state;
        if (ageSeconds <= 20) {
            state = "NORMAL";
        } else if (ageSeconds <= 45) {
            state = "WARNING";
        } else if (ageSeconds <= 90) {
            state = "STALE";
        } else {
            state = "DISCONNECTED";
        }

        return LocationResponse.builder()
                .latitude(location.getLatitude())
                .longitude(location.getLongitude())
                .speed(location.getSpeed())
                .heading(location.getHeading())
                .shuttleId(location.getShuttleId() != null ? location.getShuttleId() : "BUS-01")
                .routeId(location.getRouteId() != null ? location.getRouteId() : "ROUTE-01")
                .status(location.getStatus() != null ? location.getStatus() : "EN_ROUTE")
                .batteryLevel(location.getBatteryLevel() != null ? location.getBatteryLevel() : 90)
                .state(state)
                .updatedAt(updatedAt)
                .serverTime(now)
                .ageSeconds(ageSeconds)
                .build();
    }
}
