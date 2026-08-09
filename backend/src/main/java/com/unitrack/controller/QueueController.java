package com.unitrack.controller;

import com.unitrack.dto.QueueDTO;
import com.unitrack.exception.ResourceNotFoundException;
import com.unitrack.model.QueueStatus;
import com.unitrack.service.QueueService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/queue")
@RequiredArgsConstructor
public class QueueController {

    private final QueueService queueService;

    @PostMapping
    public ResponseEntity<QueueStatus> updateQueue(@Valid @RequestBody QueueDTO queueDTO) {
        return ResponseEntity.ok(queueService.updateQueueStatus(queueDTO));
    }

    @GetMapping
    public ResponseEntity<QueueStatus> getQueueStatus() {
        return queueService.getQueueStatus()
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No queue data available",
                        "Dispatcher has not reported a queue level yet"));
    }
}
