package com.grash.dto;

import com.grash.dto.workOrder.WorkOrderMiniDTO;
import com.grash.model.enums.DiscrepancyStatus;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class WorkOrderDiscrepancyShowDTO extends AuditShowDTO {
    private String description;
    private String correctiveMeasure;
    private DiscrepancyStatus status;
    private WorkOrderMiniDTO derivedWorkOrder;
}
