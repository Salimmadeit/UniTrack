package com.unitrack.service;

import com.unitrack.dto.LocationDTO;
import com.unitrack.model.Location;
import com.unitrack.repository.LocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class LocationService {

    private final LocationRepository locationRepository;

    public Location updateLocation(LocationDTO dto) {
        Location location = locationRepository.findById(1L).orElse(new Location());
        location.setId(1L);
        location.setLatitude(dto.getLatitude());
        location.setLongitude(dto.getLongitude());
        location.setSpeed(dto.getSpeed() != null ? dto.getSpeed() : 0.0);
        location.setHeading(dto.getHeading() != null ? dto.getHeading() : 0.0);
        location.setUpdatedAt(LocalDateTime.now());
        
        return locationRepository.save(location);
    }

    public Optional<Location> getLatestLocation() {
        return locationRepository.findById(1L);
    }
}
