package com.grash.mapper;

import com.grash.dto.RiskAssessmentPatchDTO;
import com.grash.dto.RiskAssessmentShowDTO;
import com.grash.model.RiskAssessment;
import com.grash.model.WorkOrder;
import com.grash.model.enums.Status;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.Date;

@Mapper(componentModel = "spring", uses = {WorkOrderMapper.class, UserMapper.class})
public interface RiskAssessmentMapper {

    RiskAssessment updateRiskAssessment(@MappingTarget RiskAssessment entity, RiskAssessmentPatchDTO dto);

    @Mapping(target = "completedOn", expression = "java(completedOn(model.getWorkOrder()))")
    RiskAssessmentShowDTO toShowDto(RiskAssessment model);

    /**
     * The action counts as done once its work order is complete. Read live rather than stored, so a
     * work order that gets reopened un-does the assessment too.
     */
    default Date completedOn(WorkOrder workOrder) {
        if (workOrder == null || workOrder.getStatus() != Status.COMPLETE) return null;
        return workOrder.getCompletedOn();
    }
}
