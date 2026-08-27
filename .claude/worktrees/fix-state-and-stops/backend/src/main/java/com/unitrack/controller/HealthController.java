package com.unitrack.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    @GetMapping
    public ResponseEntity<Map<String, Object>> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                // Instant, not LocalDateTime: a health timestamp with no timezone
                // offset is ambiguous to whoever reads it, and this endpoint is
                // exactly what someone checks when diagnosing a deployment across
                // timezones.
                "timestamp", Instant.now()
        ));
    }
}
