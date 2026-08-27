package com.unitrack.service;

import com.unitrack.dto.QueueDTO;
import com.unitrack.dto.QueueResponse;
import com.unitrack.model.QueueStatus;
import com.unitrack.repository.QueueStatusRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class QueueService {

    private final QueueStatusRepository queueStatusRepository;

    /**
     * Minimum gap before the *same* reporter may repeat the *same* level.
     *
     * <p>Mirrors the 10-second debounce the dispatcher console enforces in the
     * browser. The client-side guard was the only protection until students
     * could report too; a guard that lives in the page is advice, not
     * enforcement, since anyone with curl can ignore it.
     *
     * <p>Deliberately keyed on (level, source) rather than applied globally.
     * A flat "one report per 10 seconds" lock sounds stricter but behaves badly
     * here: the row is shared by everyone, and with no authentication there is no
     * per-user identity to rate-limit against, so ten students each tapping once
     * would have nine honest reports silently discarded. What the spec actually
     * asks for is protection against accidental double-taps and button spamming
     * - which is a repeat of the same value - while a genuine change of state
     * ("it was Moderate, now it is Packed") is exactly the report we must not
     * drop. Rejecting only the identical repeat draws that line.
     */
    private static final long MIN_REPORT_INTERVAL_SECONDS = 10;

    /**
     * Records a crowd level, unless it repeats the caller's own previous report
     * inside the debounce window.
     *
     * @return the stored status; on a rejected report this is the existing row,
     *         unchanged. The caller inspects {@code accepted} to tell them apart.
     */
    public QueueUpdateResult updateQueueStatus(QueueDTO dto) {
        Instant now = Instant.now();
        String level = dto.getLevel().toUpperCase();
        String source = normaliseSource(dto.getSource());

        Optional<QueueStatus> existing = queueStatusRepository.findById(1L);

        if (existing.isPresent()) {
            QueueStatus current = existing.get();
            boolean isRepeat = level.equals(current.getLevel())
                    && source.equals(current.getSource());

            if (isRepeat && current.getUpdatedAt() != null) {
                long secondsSinceLast = Duration.between(current.getUpdatedAt(), now).getSeconds();
                if (secondsSinceLast >= 0 && secondsSinceLast < MIN_REPORT_INTERVAL_SECONDS) {
                    return new QueueUpdateResult(current, false,
                            MIN_REPORT_INTERVAL_SECONDS - secondsSinceLast);
                }
            }
        }

        QueueStatus status = existing.orElseGet(QueueStatus::new);
        status.setId(1L);
        status.setLevel(level);
        status.setSource(source);
        status.setUpdatedAt(now);

        return new QueueUpdateResult(queueStatusRepository.save(status), true, 0);
    }

    /**
     * Defaults a missing source to DISPATCHER so existing callers - the
     * dispatcher console, which predates this field - keep working unchanged.
     */
    private String normaliseSource(String source) {
        if (source == null || source.isBlank()) return "DISPATCHER";
        return source.toUpperCase();
    }

    public Optional<QueueStatus> getQueueStatus() {
        return queueStatusRepository.findById(1L);
    }

    /** See LocationService#toResponse for why the age is computed server-side. */
    public QueueResponse toResponse(QueueStatus status) {
        Instant now = Instant.now();
        Instant updatedAt = status.getUpdatedAt();

        long ageSeconds = updatedAt == null
                ? Long.MAX_VALUE
                : Math.max(0, Duration.between(updatedAt, now).getSeconds());

        return QueueResponse.builder()
                .level(status.getLevel())
                .source(status.getSource())
                .updatedAt(updatedAt)
                .serverTime(now)
                .ageSeconds(ageSeconds)
                .build();
    }

    /**
     * Outcome of a report attempt. A rejected report is not an error - the
     * caller tapped too soon - so it is modelled as data rather than an
     * exception.
     */
    public record QueueUpdateResult(QueueStatus status, boolean accepted, long retryAfterSeconds) {
    }
}
