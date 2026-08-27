package com.grash.dto.workOrder;

import com.grash.dto.*;
import com.grash.model.enums.Status;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
public class WorkOrderShowDTO extends WorkOrderBaseShowDTO {

    private UserMiniDTO completedBy;

    private Date completedOn;

    private boolean archived;

    private RequestMiniDTO parentRequest;

    private PreventiveMaintenanceMiniDTO parentPreventiveMaintenance;

    private FileShowDTO signature;

    /**
     * Base64 data URI of a signature captured before signatures moved to object storage. Only set
     * for work orders signed back then, in which case {@link #signature} is null.
     */
    private String legacySignature;

    private Status status;

    private String feedback;

    private FileShowDTO audioDescription;

    private String customId;
}
