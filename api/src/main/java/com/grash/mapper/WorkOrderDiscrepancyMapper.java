package com.grash.mapper;

import com.grash.dto.WorkOrderDiscrepancyPatchDTO;
import com.grash.dto.WorkOrderDiscrepancyShowDTO;
import com.grash.model.WorkOrderDiscrepancy;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.Mappings;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", uses = {WorkOrderMapper.class})
public interface WorkOrderDiscrepancyMapper {

    /**
     * Leaves fields the patch does not mention alone, so callers can send just the field they are
     * changing. To clear the corrective measure, send an empty string rather than null.
     */
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    WorkOrderDiscrepancy updateWorkOrderDiscrepancy(@MappingTarget WorkOrderDiscrepancy entity,
                                                    WorkOrderDiscrepancyPatchDTO dto);

    @Mappings({})
    WorkOrderDiscrepancyPatchDTO toPatchDto(WorkOrderDiscrepancy model);

    WorkOrderDiscrepancyShowDTO toShowDto(WorkOrderDiscrepancy model);
}
