package com.grash.dto;

import com.grash.model.enums.DiscrepancyStatus;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class WorkOrderDiscrepancyPatchDTO {
    private String description;
    private String correctiveMeasure;
    private DiscrepancyStatus status;
}
