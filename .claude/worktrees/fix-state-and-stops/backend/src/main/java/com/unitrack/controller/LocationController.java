package com.unitrack.controller;

import com.unitrack.dto.LocationDTO;
import com.unitrack.dto.LocationResponse;
import com.unitrack.exception.ResourceNotFoundException;
import com.unitrack.service.LocationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/location")
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;

    @PostMapping
    public ResponseEntity<LocationResponse> updateLocation(@Valid @RequestBody LocationDTO locationDTO) {
        return ResponseEntity.ok(
                locationService.toResponse(locationService.updateLocation(locationDTO)));
    }

    /**
     * Throws instead of returning an empty 404 body so the response matches the
     * documented error shape and the student UI can explain *why* the map is
     * empty rather than showing a generic failure.
     */
    @GetMapping
    public ResponseEntity<LocationResponse> getLatestLocation() {
        return locationService.getLatestLocation()
                .map(locationService::toResponse)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No location data available",
                        "Driver has not started broadcasting"));
    }
}
