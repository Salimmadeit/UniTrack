package com.unitrack.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class EtaResponse {
    private double etaMinutes;
    private double distanceKm;
    private double shuttleSpeed;
    private String confidence;
    private double walkingMinutes;
    private boolean walkingFaster;
    private int queueWaitMinutes;
    private String nearestStop;
}
