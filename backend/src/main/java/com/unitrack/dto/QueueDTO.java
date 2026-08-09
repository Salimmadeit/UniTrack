package com.unitrack.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class QueueDTO {

    @NotBlank(message = "Level is required")
    @Pattern(regexp = "^(?i)(LOW|MODERATE|PACKED)$", message = "Level must be one of: LOW, MODERATE, PACKED")
    private String level;
}
