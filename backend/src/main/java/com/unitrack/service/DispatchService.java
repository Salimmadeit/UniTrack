package com.unitrack.service;

import com.unitrack.dto.DispatchRequestDTO;
import com.unitrack.model.DispatchRequest;
import com.unitrack.exception.ResourceNotFoundException;
import com.unitrack.repository.DispatchRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
public class DispatchService {

    private final DispatchRequestRepository repository;

    @Autowired
    public DispatchService(DispatchRequestRepository repository) {
        this.repository = repository;
    }

    public DispatchRequest createRequest(DispatchRequestDTO dto) {
        String station = dto.getStationName().trim();
        Instant thirtySecondsAgo = Instant.now().minus(Duration.ofSeconds(30));

        // Aggregate recent requests for same stop to prevent duplicate spam
        List<DispatchRequest> recent = repository.findByStationNameAndCreatedAtAfter(station, thirtySecondsAgo);
        if (!recent.isEmpty()) {
            DispatchRequest existing = recent.get(0);
            int increment = dto.getPassengerCount() != null ? dto.getPassengerCount() : 1;
            existing.setPassengerCount(existing.getPassengerCount() + increment);
            return repository.save(existing);
        }

        DispatchRequest req = new DispatchRequest();
        req.setStationName(station);
        req.setPassengerCount(dto.getPassengerCount() != null && dto.getPassengerCount() > 0 ? dto.getPassengerCount() : 1);
        req.setNote(dto.getNote());
        req.setStatus("PENDING");
        req.setCreatedAt(Instant.now());

        return repository.save(req);
    }

    public List<DispatchRequest> getActiveAlerts() {
        // Active alerts in last 15 minutes
        Instant fifteenMinutesAgo = Instant.now().minus(Duration.ofMinutes(15));
        return repository.findByStatusAndCreatedAtAfterOrderByCreatedAtDesc("PENDING", fifteenMinutesAgo);
    }

    public DispatchRequest acknowledge(Long id, String shuttleId) {
        DispatchRequest req = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Not found", "Dispatch request with ID " + id + " does not exist"));
        req.setStatus("ACKNOWLEDGED");
        req.setAcknowledgedBy(shuttleId != null ? shuttleId : "BUS-01");
        return repository.save(req);
    }
}
