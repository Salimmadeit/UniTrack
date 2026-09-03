package com.unitrack.controller;

import com.unitrack.dto.DispatchRequestDTO;
import com.unitrack.model.DispatchRequest;
import com.unitrack.service.DispatchService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/dispatch")
public class DispatchController {

    private final DispatchService dispatchService;

    @Autowired
    public DispatchController(DispatchService dispatchService) {
        this.dispatchService = dispatchService;
    }

    @PostMapping("/request")
    public ResponseEntity<DispatchRequest> requestBus(@Valid @RequestBody DispatchRequestDTO dto) {
        return ResponseEntity.ok(dispatchService.createRequest(dto));
    }

    @GetMapping("/alerts")
    public ResponseEntity<List<DispatchRequest>> getActiveAlerts() {
        return ResponseEntity.ok(dispatchService.getActiveAlerts());
    }

    @PostMapping("/acknowledge/{id}")
    public ResponseEntity<DispatchRequest> acknowledge(@PathVariable Long id, @RequestBody(required = false) Map<String, String> payload) {
        String shuttleId = payload != null ? payload.get("shuttleId") : "BUS-01";
        return ResponseEntity.ok(dispatchService.acknowledge(id, shuttleId));
    }
}
