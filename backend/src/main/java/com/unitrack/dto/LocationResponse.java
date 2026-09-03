package com.unitrack.dto;

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
public class LocationResponse {

    private Double latitude;
    private Double longitude;
    private Double speed;
    private Double heading;

    private String shuttleId;
    private String routeId;
    private String status;
    private Integer batteryLevel;
    private String state;

    private Instant updatedAt;
    private Instant serverTime;
    private long ageSeconds;

    public LocationResponse() {}

    public LocationResponse(Double latitude, Double longitude, Double speed, Double heading,
                            String shuttleId, String routeId, String status, Integer batteryLevel,
                            String state, Instant updatedAt, Instant serverTime, long ageSeconds) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.speed = speed;
        this.heading = heading;
        this.shuttleId = shuttleId;
        this.routeId = routeId;
        this.status = status;
        this.batteryLevel = batteryLevel;
        this.state = state;
        this.updatedAt = updatedAt;
        this.serverTime = serverTime;
        this.ageSeconds = ageSeconds;
    }

    public static LocationResponseBuilder builder() {
        return new LocationResponseBuilder();
    }

    public static class LocationResponseBuilder {
        private Double latitude;
        private Double longitude;
        private Double speed;
        private Double heading;
        private String shuttleId;
        private String routeId;
        private String status;
        private Integer batteryLevel;
        private String state;
        private Instant updatedAt;
        private Instant serverTime;
        private long ageSeconds;

        public LocationResponseBuilder latitude(Double latitude) { this.latitude = latitude; return this; }
        public LocationResponseBuilder longitude(Double longitude) { this.longitude = longitude; return this; }
        public LocationResponseBuilder speed(Double speed) { this.speed = speed; return this; }
        public LocationResponseBuilder heading(Double heading) { this.heading = heading; return this; }
        public LocationResponseBuilder shuttleId(String shuttleId) { this.shuttleId = shuttleId; return this; }
        public LocationResponseBuilder routeId(String routeId) { this.routeId = routeId; return this; }
        public LocationResponseBuilder status(String status) { this.status = status; return this; }
        public LocationResponseBuilder batteryLevel(Integer batteryLevel) { this.batteryLevel = batteryLevel; return this; }
        public LocationResponseBuilder state(String state) { this.state = state; return this; }
        public LocationResponseBuilder updatedAt(Instant updatedAt) { this.updatedAt = updatedAt; return this; }
        public LocationResponseBuilder serverTime(Instant serverTime) { this.serverTime = serverTime; return this; }
        public LocationResponseBuilder ageSeconds(long ageSeconds) { this.ageSeconds = ageSeconds; return this; }

        public LocationResponse build() {
            return new LocationResponse(latitude, longitude, speed, heading, shuttleId, routeId, status, batteryLevel, state, updatedAt, serverTime, ageSeconds);
        }
    }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Double getSpeed() { return speed; }
    public void setSpeed(Double speed) { this.speed = speed; }

    public Double getHeading() { return heading; }
    public void setHeading(Double heading) { this.heading = heading; }

    public String getShuttleId() { return shuttleId; }
    public void setShuttleId(String shuttleId) { this.shuttleId = shuttleId; }

    public String getRouteId() { return routeId; }
    public void setRouteId(String routeId) { this.routeId = routeId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getBatteryLevel() { return batteryLevel; }
    public void setBatteryLevel(Integer batteryLevel) { this.batteryLevel = batteryLevel; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public Instant getServerTime() { return serverTime; }
    public void setServerTime(Instant serverTime) { this.serverTime = serverTime; }

    public long getAgeSeconds() { return ageSeconds; }
    public void setAgeSeconds(long ageSeconds) { this.ageSeconds = ageSeconds; }
}
