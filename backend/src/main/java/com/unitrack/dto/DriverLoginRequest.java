package com.unitrack.dto;

import jakarta.validation.constraints.NotBlank;

public class DriverLoginRequest {

    @NotBlank(message = "Shuttle ID is required")
    private String shuttleId;

    @NotBlank(message = "Driver PIN is required")
    private String pin;

    private String googleToken;

    public DriverLoginRequest() {}

    public String getShuttleId() { return shuttleId; }
    public void setShuttleId(String shuttleId) { this.shuttleId = shuttleId; }

    public String getPin() { return pin; }
    public void setPin(String pin) { this.pin = pin; }

    public String getGoogleToken() { return googleToken; }
    public void setGoogleToken(String googleToken) { this.googleToken = googleToken; }
}
