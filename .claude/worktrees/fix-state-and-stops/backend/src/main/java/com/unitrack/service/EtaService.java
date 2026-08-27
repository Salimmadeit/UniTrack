package com.unitrack.service;

import com.unitrack.dto.EtaResponse;
import com.unitrack.exception.ResourceNotFoundException;
import com.unitrack.model.Location;
import com.unitrack.model.QueueStatus;
import com.unitrack.model.Stop;
import com.unitrack.repository.StopRepository;
import com.unitrack.util.HaversineUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EtaService {

    private final LocationService locationService;
    private final QueueService queueService;
    private final StopRepository stopRepository;
    
    private static final double WALKING_SPEED_KMH = 5.0;
    private static final double DEFAULT_SHUTTLE_SPEED_KMH = 20.0;
    private static final double MIN_SHUTTLE_SPEED_KMH = 2.0;

    public EtaResponse calculateEta(double studentLat, double studentLng) {
        Location location = locationService.getLatestLocation()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Cannot calculate ETA",
                        "No driver location available"));
                
        // Find nearest stop to student
        List<Stop> allStops = stopRepository.findAll();
        Stop nearestStop = null;
        double minDistanceToStop = Double.MAX_VALUE;
        
        for (Stop stop : allStops) {
            double dist = HaversineUtil.distance(studentLat, studentLng, stop.getLatitude(), stop.getLongitude());
            if (dist < minDistanceToStop) {
                minDistanceToStop = dist;
                nearestStop = stop;
            }
        }
        
        // Calculate distance from shuttle to student's nearest stop
        double distanceKm = 0.0;
        if (nearestStop != null) {
            distanceKm = HaversineUtil.distance(location.getLatitude(), location.getLongitude(), 
                                               nearestStop.getLatitude(), nearestStop.getLongitude());
        }

        // Speed logic: a stopped or crawling shuttle (traffic light, loading
        // passengers) would divide by ~0 and produce an absurd ETA, so fall back
        // to a typical campus cruising speed instead.
        double speed = location.getSpeed() != null ? location.getSpeed() : 0.0;
        if (speed < MIN_SHUTTLE_SPEED_KMH) {
            speed = DEFAULT_SHUTTLE_SPEED_KMH;
        }

        double etaMinutes = (distanceKm / speed) * 60.0;
        
        // Walking logic
        double walkingMinutes = 0.0;
        if (nearestStop != null) {
            walkingMinutes = (minDistanceToStop / WALKING_SPEED_KMH) * 60.0;
        }
        
        // Queue wait time
        QueueStatus queueStatus = queueService.getQueueStatus().orElse(null);
        int queueWaitMinutes = getQueueWaitMinutes(queueStatus);
        
        boolean walkingFaster = (etaMinutes + queueWaitMinutes) > walkingMinutes;

        // Confidence based on data freshness. Both operands are Instants read
        // from this machine's clock, so no timezone conversion is involved and
        // the age cannot be thrown off by where the caller happens to be.
        long secondsSinceUpdate = location.getUpdatedAt() == null
                ? Long.MAX_VALUE
                : Math.max(0, Duration.between(location.getUpdatedAt(), Instant.now()).getSeconds());
        String confidence = getConfidence(secondsSinceUpdate);

        return EtaResponse.builder()
                .etaMinutes(Math.round(etaMinutes * 10.0) / 10.0)
                .distanceKm(Math.round(distanceKm * 100.0) / 100.0)
                .shuttleSpeed(speed)
                .confidence(confidence)
                .walkingMinutes(Math.round(walkingMinutes * 10.0) / 10.0)
                .walkingFaster(walkingFaster)
                .queueWaitMinutes(queueWaitMinutes)
                .nearestStop(nearestStop != null ? nearestStop.getName() : "Unknown")
                .build();
    }
    
    private int getQueueWaitMinutes(QueueStatus status) {
        if (status == null) return 2; // Default
        return switch (status.getLevel().toUpperCase()) {
            case "LOW" -> 2;
            case "MODERATE" -> 8;
            case "PACKED" -> 15;
            default -> 2;
        };
    }
    
    private String getConfidence(long secondsSinceUpdate) {
        if (secondsSinceUpdate <= 15) return "NORMAL";
        if (secondsSinceUpdate <= 30) return "WARNING";
        if (secondsSinceUpdate <= 60) return "STALE";
        return "DISCONNECTED";
    }
}
