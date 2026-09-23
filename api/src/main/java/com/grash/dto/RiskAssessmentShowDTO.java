package com.grash.dto;

import com.grash.dto.workOrder.WorkOrderMiniDTO;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
public class RiskAssessmentShowDTO extends AuditShowDTO {
    private String hazard;
    private String whoMightBeHarmed;
    private String currentControls;
    private String furtherAction;
    private UserMiniDTO actionOwner;
    private Date actionDueDate;
    private WorkOrderMiniDTO workOrder;
    /**
     * When the work order carrying out the action was completed; null while there is none or it is
     * not complete. This is the "done" column.
     */
    private Date completedOn;
}
