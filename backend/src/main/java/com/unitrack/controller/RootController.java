package com.unitrack.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Service index at {@code GET /}.
 *
 * <p>Every endpoint in this API lives under {@code /api/v1}, so the bare
 * hostname previously matched nothing and answered 404. That is technically
 * correct and completely unhelpful: opening the deployed URL in a browser is
 * the first thing anyone does to check whether a backend is alive, and being
 * told "Not found" strongly implies the deployment is broken when it is
 * actually healthy.
 *
 * <p>This returns a small manifest instead, so the root URL answers the two
 * questions someone actually has: is it up, and what can I call?
 */
@RestController
public class RootController {

    private final String applicationName;

    public RootController(@Value("${spring.application.name:UniTrack}") String applicationName) {
        this.applicationName = applicationName;
    }

    @GetMapping("/")
    public ResponseEntity<Map<String, Object>> index() {
        Map<String, String> endpoints = new LinkedHashMap<>();
        endpoints.put("health", "GET /api/v1/health");
        endpoints.put("location", "GET /api/v1/location, POST /api/v1/location");
        endpoints.put("queue", "GET /api/v1/queue, POST /api/v1/queue");
        endpoints.put("eta", "GET /api/v1/eta?lat={lat}&lng={lng}");
        endpoints.put("routes", "GET /api/v1/routes");

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("service", applicationName);
        payload.put("status", "UP");
        payload.put("documentation", "https://github.com/Salimmadeit/UniTrack/blob/main/docs/api.md");
        payload.put("endpoints", endpoints);
        payload.put("notes", List.of(
                "All endpoints are versioned under /api/v1.",
                "On a free-tier host the first request after ~15 minutes idle "
                        + "can take up to a minute while the service wakes."
        ));

        return ResponseEntity.ok(payload);
    }
}
