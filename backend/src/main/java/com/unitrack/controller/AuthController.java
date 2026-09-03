package com.unitrack.controller;

import com.unitrack.dto.DriverAuthResponse;
import com.unitrack.dto.DriverLoginRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    // Simple in-memory token store for MVP session validation
    private static final Map<String, String> ACTIVE_TOKENS = new ConcurrentHashMap<>();

    @PostMapping("/driver/login")
    public ResponseEntity<DriverAuthResponse> driverLogin(@Valid @RequestBody DriverLoginRequest request) {
        String shuttle = request.getShuttleId().trim().toUpperCase();
        String pin = request.getPin().trim();

        // Valid demo PINs: 1234, unilag2026, 2026
        boolean validPin = "1234".equals(pin) || "unilag2026".equalsIgnoreCase(pin) || "2026".equals(pin);

        if (!validPin && request.getGoogleToken() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                    DriverAuthResponse.builder()
                            .authenticated(false)
                            .message("Invalid driver PIN. Default campus PIN is 1234 or unilag2026")
                            .build()
            );
        }

        String token = "DRV-" + UUID.randomUUID().toString().substring(0, 8);
        ACTIVE_TOKENS.put(token, shuttle);

        String driverName = "Driver (" + shuttle + ")";
        return ResponseEntity.ok(
                DriverAuthResponse.builder()
                        .authenticated(true)
                        .token(token)
                        .shuttleId(shuttle)
                        .driverName(driverName)
                        .message("Driver authenticated successfully")
                        .build()
        );
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> checkStatus(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (ACTIVE_TOKENS.containsKey(token)) {
                return ResponseEntity.ok(Map.of(
                        "authenticated", true,
                        "shuttleId", ACTIVE_TOKENS.get(token),
                        "role", "DRIVER"
                ));
            }
        }
        return ResponseEntity.ok(Map.of("authenticated", false));
    }
}
