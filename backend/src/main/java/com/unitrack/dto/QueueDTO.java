package com.unitrack.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class QueueDTO {

    @NotBlank(message = "Level is required")
    @Pattern(regexp = "^(?i)(LOW|MODERATE|PACKED)$", message = "Level must be one of: LOW, MODERATE, PACKED")
    private String level;

    /**
     * Who is reporting: STUDENT or DISPATCHER.
     *
     * <p>Optional, and absent means DISPATCHER. Left optional on purpose so the
     * existing dispatcher console keeps working without a change, and so the
     * documented contract stays backward compatible.
     */
    @Pattern(regexp = "^(?i)(STUDENT|DISPATCHER)$", message = "Source must be either STUDENT or DISPATCHER")
    private String source;
}
