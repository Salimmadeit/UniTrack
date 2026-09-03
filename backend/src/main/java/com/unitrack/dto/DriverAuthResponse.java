package com.unitrack.dto;

public class DriverAuthResponse {
    private boolean authenticated;
    private String token;
    private String shuttleId;
    private String driverName;
    private String message;

    public DriverAuthResponse() {}

    public DriverAuthResponse(boolean authenticated, String token, String shuttleId, String driverName, String message) {
        this.authenticated = authenticated;
        this.token = token;
        this.shuttleId = shuttleId;
        this.driverName = driverName;
        this.message = message;
    }

    public static DriverAuthResponseBuilder builder() {
        return new DriverAuthResponseBuilder();
    }

    public static class DriverAuthResponseBuilder {
        private boolean authenticated;
        private String token;
        private String shuttleId;
        private String driverName;
        private String message;

        public DriverAuthResponseBuilder authenticated(boolean authenticated) { this.authenticated = authenticated; return this; }
        public DriverAuthResponseBuilder token(String token) { this.token = token; return this; }
        public DriverAuthResponseBuilder shuttleId(String shuttleId) { this.shuttleId = shuttleId; return this; }
        public DriverAuthResponseBuilder driverName(String driverName) { this.driverName = driverName; return this; }
        public DriverAuthResponseBuilder message(String message) { this.message = message; return this; }

        public DriverAuthResponse build() {
            return new DriverAuthResponse(authenticated, token, shuttleId, driverName, message);
        }
    }

    public boolean isAuthenticated() { return authenticated; }
    public void setAuthenticated(boolean authenticated) { this.authenticated = authenticated; }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getShuttleId() { return shuttleId; }
    public void setShuttleId(String shuttleId) { this.shuttleId = shuttleId; }

    public String getDriverName() { return driverName; }
    public void setDriverName(String driverName) { this.driverName = driverName; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
