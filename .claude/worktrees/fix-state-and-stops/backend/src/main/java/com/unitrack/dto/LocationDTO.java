package com.unitrack.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class LocationDTO {

    @NotNull(message = "Latitude is required")
    @Min(value = -90, message = "Latitude must be between -90 and 90")
    @Max(value = 90, message = "Latitude must be between -90 and 90")
    private Double latitude;

    @NotNull(message = "Longitude is required")
    @Min(value = -180, message = "Longitude must be between -180 and 180")
    @Max(value = 180, message = "Longitude must be between -180 and 180")
    private Double longitude;

    @Min(value = 0, message = "Speed must be positive")
    private Double speed = 0.0;

    @Min(value = 0, message = "Heading must be between 0 and 360")
    @Max(value = 360, message = "Heading must be between 0 and 360")
    private Double heading = 0.0;
}
