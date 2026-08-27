package com.unitrack.service;

import com.unitrack.dto.LocationDTO;
import com.unitrack.dto.LocationResponse;
import com.unitrack.model.Location;
import com.unitrack.repository.LocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class LocationService {

    private final LocationRepository locationRepository;

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
        location.setUpdatedAt(Instant.now());

        return locationRepository.save(location);
    }

    public Optional<Location> getLatestLocation() {
        return locationRepository.findById(1L);
    }

    /**
     * Wraps a stored reading in the public response shape, stamping it with the
     * server's clock.
     *
     * <p>Both {@code now} and {@code updatedAt} originate on this machine, so the
     * age below is computed from a single consistent clock. That is the whole
     * point: the client is handed a number it can use as-is instead of
     * subtracting our timestamp from its own clock and inheriting every
     * discrepancy between the two.
     */
    public LocationResponse toResponse(Location location) {
        Instant now = Instant.now();
        Instant updatedAt = location.getUpdatedAt();

        // A clamp at zero, not an absolute value: a negative age can only mean
        // clock weirdness, and reporting "0" (treated as fresh) is safer than a
        // large positive number that would wrongly read as DISCONNECTED.
        long ageSeconds = updatedAt == null
                ? Long.MAX_VALUE
                : Math.max(0, Duration.between(updatedAt, now).getSeconds());

        return LocationResponse.builder()
                .latitude(location.getLatitude())
                .longitude(location.getLongitude())
                .speed(location.getSpeed())
                .heading(location.getHeading())
                .updatedAt(updatedAt)
                .serverTime(now)
                .ageSeconds(ageSeconds)
                .build();
    }
}
