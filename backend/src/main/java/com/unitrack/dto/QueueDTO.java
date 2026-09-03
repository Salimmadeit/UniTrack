package com.unitrack.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class QueueDTO {

    @NotBlank(message = "Level is required")
    @Pattern(regexp = "^(?i)(LOW|MODERATE|PACKED)$", message = "Level must be one of: LOW, MODERATE, PACKED")
    private String level;

    @Pattern(regexp = "^(?i)(STUDENT|DISPATCHER)$", message = "Source must be either STUDENT or DISPATCHER")
    private String source;

    public QueueDTO() {}

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
}
