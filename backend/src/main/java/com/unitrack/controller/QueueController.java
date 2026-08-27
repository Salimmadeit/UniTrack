package com.unitrack.controller;

import com.unitrack.dto.QueueDTO;
import com.unitrack.dto.QueueResponse;
import com.unitrack.exception.ResourceNotFoundException;
import com.unitrack.service.QueueService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/queue")
@RequiredArgsConstructor
public class QueueController {

    private final QueueService queueService;

    /**
     * Records a crowd level from a dispatcher or a student.
     *
     * <p>Returns 429 with a Retry-After header when the report lands inside the
     * debounce window. 429 rather than 400: the payload was perfectly valid, the
     * caller was simply too quick, and the distinction lets the UI say "hold on
     * a moment" instead of "that was invalid". The body is still the current
     * queue state, so a rejected caller does not have to issue a second request
     * to refresh its display.
     */
    @PostMapping
    public ResponseEntity<QueueResponse> updateQueue(@Valid @RequestBody QueueDTO queueDTO) {
        QueueService.QueueUpdateResult result = queueService.updateQueueStatus(queueDTO);
        QueueResponse body = queueService.toResponse(result.status());

        if (!result.accepted()) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .header(HttpHeaders.RETRY_AFTER, String.valueOf(result.retryAfterSeconds()))
                    .body(body);
        }

        return ResponseEntity.ok(body);
    }

    @GetMapping
    public ResponseEntity<QueueResponse> getQueueStatus() {
        return queueService.getQueueStatus()
                .map(queueService::toResponse)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No queue data available",
                        "Nobody has reported a queue level yet"));
    }
}
