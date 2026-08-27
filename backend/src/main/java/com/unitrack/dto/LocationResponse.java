package com.unitrack.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * The shape returned by GET /api/v1/location.
 *
 * <p>Why a DTO instead of the Location entity: returning the entity leaked the
 * database surface (including its primary key) into the public contract, and it
 * carried only a raw timestamp. The client then had to work out how old the
 * reading was by subtracting that timestamp from its own clock - which is wrong
 * twice over. The server and the phone can sit in different timezones, and a
 * phone's clock can simply be wrong; either one silently corrupts the freshness
 * calculation that the whole network state machine is built on.
 *
 * <p>So the server does the arithmetic and publishes the answer. {@code
 * ageSeconds} is computed against the server's own clock, where both timestamps
 * come from the same source and cannot disagree. The client reads it directly.
 */
@Data
@Builder
public class LocationResponse {

    private Double latitude;
    private Double longitude;
    private Double speed;
    private Double heading;

    /**
     * When the reading was recorded. Serialised as an ISO-8601 instant with a
     * trailing Z (e.g. "2026-08-26T13:00:00.123Z"), so it is unambiguous no
     * matter which timezone the reader is in.
     */
    private Instant updatedAt;

    /**
     * The server's "now" at the moment this response was built. Exposed so a
     * client can detect its own clock skew, and so the age below can be
     * independently verified rather than simply trusted.
     */
    private Instant serverTime;

    /**
     * Age of the reading in seconds, measured entirely on the server.
     * This is the value the network state machine should use.
     */
    private long ageSeconds;
}
