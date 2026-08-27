package com.unitrack.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * The shape returned by GET /api/v1/queue.
 *
 * <p>Mirrors {@link LocationResponse}: an unambiguous instant plus a
 * server-computed age, so the client is never asked to reconcile two clocks.
 * A queue report also goes stale - a "Packed" reading from forty minutes ago
 * should not be presented as the current state of the stop - so the age matters
 * here for the same reason it does for a shuttle position.
 */
@Data
@Builder
public class QueueResponse {

    /** LOW, MODERATE or PACKED. */
    private String level;

    /** "DISPATCHER" or "STUDENT" - see QueueStatus.source. */
    private String source;

    private Instant updatedAt;
    private Instant serverTime;
    private long ageSeconds;
}
