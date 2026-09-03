package com.unitrack.dto;

import jakarta.validation.constraints.NotBlank;

public class DispatchRequestDTO {

    @NotBlank(message = "Station name is required")
    private String stationName;

    private Integer passengerCount = 1;
    private String note;

    public DispatchRequestDTO() {}

    public String getStationName() { return stationName; }
    public void setStationName(String stationName) { this.stationName = stationName; }

    public Integer getPassengerCount() { return passengerCount; }
    public void setPassengerCount(Integer passengerCount) { this.passengerCount = passengerCount; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
