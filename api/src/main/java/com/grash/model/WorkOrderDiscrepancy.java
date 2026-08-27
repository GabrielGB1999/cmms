package com.grash.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.grash.dto.IdDTO;
import com.grash.model.abstracts.CompanyAudit;
import com.grash.model.enums.DiscrepancyStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.NotNull;

/**
 * A discrepancy (or squawk) found while carrying out a work order: something not as it should be,
 * recorded against the work order it was found on, optionally with the corrective measure taken.
 * Anything not corrected on the spot can be carried into a derived work order of its own.
 */
@Entity
@Data
@NoArgsConstructor
public class WorkOrderDiscrepancy extends CompanyAudit {

    @NotNull
    @Column(columnDefinition = "text")
    private String description;

    /**
     * What was done about it, when it was dealt with during the procedure.
     */
    @Column(columnDefinition = "text")
    private String correctiveMeasure;

    @NotNull
    private DiscrepancyStatus status = DiscrepancyStatus.OPEN;

    /**
     * The work order this was found on.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @NotNull
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Schema(implementation = IdDTO.class)
    private WorkOrder workOrder;

    /**
     * The work order raised to deal with this discrepancy, if one was. Set by the derived work order
     * endpoint, which also links the two work orders with a SPLIT_FROM relation.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @Schema(implementation = IdDTO.class)
    private WorkOrder derivedWorkOrder;
}
