package com.unitrack.repository;

import com.unitrack.model.DispatchRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface DispatchRequestRepository extends JpaRepository<DispatchRequest, Long> {
    List<DispatchRequest> findByStatusAndCreatedAtAfterOrderByCreatedAtDesc(String status, Instant after);
    List<DispatchRequest> findByStationNameAndCreatedAtAfter(String stationName, Instant after);
}
