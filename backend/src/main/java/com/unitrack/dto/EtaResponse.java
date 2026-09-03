package com.unitrack.dto;

public class EtaResponse {
    private double etaMinutes;
    private double distanceKm;
    private double shuttleSpeed;
    private String confidence;
    private double walkingMinutes;
    private boolean walkingFaster;
    private int queueWaitMinutes;
    private String nearestStop;
    private Double shuttleLatitude;
    private Double shuttleLongitude;

    public EtaResponse() {}

    public EtaResponse(double etaMinutes, double distanceKm, double shuttleSpeed, String confidence,
                       double walkingMinutes, boolean walkingFaster, int queueWaitMinutes,
                       String nearestStop, Double shuttleLatitude, Double shuttleLongitude) {
        this.etaMinutes = etaMinutes;
        this.distanceKm = distanceKm;
        this.shuttleSpeed = shuttleSpeed;
        this.confidence = confidence;
        this.walkingMinutes = walkingMinutes;
        this.walkingFaster = walkingFaster;
        this.queueWaitMinutes = queueWaitMinutes;
        this.nearestStop = nearestStop;
        this.shuttleLatitude = shuttleLatitude;
        this.shuttleLongitude = shuttleLongitude;
    }

    public static EtaResponseBuilder builder() {
        return new EtaResponseBuilder();
    }

    public static class EtaResponseBuilder {
        private double etaMinutes;
        private double distanceKm;
        private double shuttleSpeed;
        private String confidence;
        private double walkingMinutes;
        private boolean walkingFaster;
        private int queueWaitMinutes;
        private String nearestStop;
        private Double shuttleLatitude;
        private Double shuttleLongitude;

        public EtaResponseBuilder etaMinutes(double etaMinutes) { this.etaMinutes = etaMinutes; return this; }
        public EtaResponseBuilder distanceKm(double distanceKm) { this.distanceKm = distanceKm; return this; }
        public EtaResponseBuilder shuttleSpeed(double shuttleSpeed) { this.shuttleSpeed = shuttleSpeed; return this; }
        public EtaResponseBuilder confidence(String confidence) { this.confidence = confidence; return this; }
        public EtaResponseBuilder walkingMinutes(double walkingMinutes) { this.walkingMinutes = walkingMinutes; return this; }
        public EtaResponseBuilder walkingFaster(boolean walkingFaster) { this.walkingFaster = walkingFaster; return this; }
        public EtaResponseBuilder queueWaitMinutes(int queueWaitMinutes) { this.queueWaitMinutes = queueWaitMinutes; return this; }
        public EtaResponseBuilder nearestStop(String nearestStop) { this.nearestStop = nearestStop; return this; }
        public EtaResponseBuilder shuttleLatitude(Double shuttleLatitude) { this.shuttleLatitude = shuttleLatitude; return this; }
        public EtaResponseBuilder shuttleLongitude(Double shuttleLongitude) { this.shuttleLongitude = shuttleLongitude; return this; }

        public EtaResponse build() {
            return new EtaResponse(etaMinutes, distanceKm, shuttleSpeed, confidence, walkingMinutes, walkingFaster, queueWaitMinutes, nearestStop, shuttleLatitude, shuttleLongitude);
        }
    }

    public double getEtaMinutes() { return etaMinutes; }
    public void setEtaMinutes(double etaMinutes) { this.etaMinutes = etaMinutes; }

    public double getDistanceKm() { return distanceKm; }
    public void setDistanceKm(double distanceKm) { this.distanceKm = distanceKm; }

    public double getShuttleSpeed() { return shuttleSpeed; }
    public void setShuttleSpeed(double shuttleSpeed) { this.shuttleSpeed = shuttleSpeed; }

    public String getConfidence() { return confidence; }
    public void setConfidence(String confidence) { this.confidence = confidence; }

    public double getWalkingMinutes() { return walkingMinutes; }
    public void setWalkingMinutes(double walkingMinutes) { this.walkingMinutes = walkingMinutes; }

    public boolean isWalkingFaster() { return walkingFaster; }
    public void setWalkingFaster(boolean walkingFaster) { this.walkingFaster = walkingFaster; }

    public int getQueueWaitMinutes() { return queueWaitMinutes; }
    public void setQueueWaitMinutes(int queueWaitMinutes) { this.queueWaitMinutes = queueWaitMinutes; }

    public String getNearestStop() { return nearestStop; }
    public void setNearestStop(String nearestStop) { this.nearestStop = nearestStop; }

    public Double getShuttleLatitude() { return shuttleLatitude; }
    public void setShuttleLatitude(Double shuttleLatitude) { this.shuttleLatitude = shuttleLatitude; }

    public Double getShuttleLongitude() { return shuttleLongitude; }
    public void setShuttleLongitude(Double shuttleLongitude) { this.shuttleLongitude = shuttleLongitude; }
}
