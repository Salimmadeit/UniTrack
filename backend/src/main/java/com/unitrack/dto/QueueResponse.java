package com.unitrack.dto;

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
public class QueueResponse {

    private String level;
    private String source;
    private Instant updatedAt;
    private Instant serverTime;
    private long ageSeconds;

    public QueueResponse() {}

    public QueueResponse(String level, String source, Instant updatedAt, Instant serverTime, long ageSeconds) {
        this.level = level;
        this.source = source;
        this.updatedAt = updatedAt;
        this.serverTime = serverTime;
        this.ageSeconds = ageSeconds;
    }

    public static QueueResponseBuilder builder() {
        return new QueueResponseBuilder();
    }

    public static class QueueResponseBuilder {
        private String level;
        private String source;
        private Instant updatedAt;
        private Instant serverTime;
        private long ageSeconds;

        public QueueResponseBuilder level(String level) { this.level = level; return this; }
        public QueueResponseBuilder source(String source) { this.source = source; return this; }
        public QueueResponseBuilder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }
        public QueueResponseBuilder serverTime(Instant serverTime) { this.serverTime = serverTime; return this; }
        public QueueResponseBuilder ageSeconds(long ageSeconds) { this.ageSeconds = ageSeconds; return this; }

        public QueueResponse build() {
            return new QueueResponse(level, source, updatedAt, serverTime, ageSeconds);
        }
    }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public Instant getServerTime() { return serverTime; }
    public void setServerTime(Instant serverTime) { this.serverTime = serverTime; }

    public long getAgeSeconds() { return ageSeconds; }
    public void setAgeSeconds(long ageSeconds) { this.ageSeconds = ageSeconds; }
}
