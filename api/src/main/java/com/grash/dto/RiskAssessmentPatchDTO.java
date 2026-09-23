package com.grash.dto;

import com.grash.model.OwnUser;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import java.util.Date;

/**
 * The editable fields of a risk assessment. The edit form always sends the whole row, so an absent
 * field is cleared rather than left alone - that is how the action owner or due date gets removed.
 */
@Data
@NoArgsConstructor
public class RiskAssessmentPatchDTO {
    @NotBlank
    private String hazard;
    private String whoMightBeHarmed;
    private String currentControls;
    private String furtherAction;
    private OwnUser actionOwner;
    private Date actionDueDate;
}
