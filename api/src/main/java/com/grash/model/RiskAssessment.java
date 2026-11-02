package com.grash.model;

import com.grash.dto.IdDTO;
import com.grash.model.abstracts.CompanyAudit;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.NotNull;

import java.util.Date;

/**
 * One row of the safety risk assessment: a hazard, who it could harm, what already controls it, and
 * the further action needed - following the columns of the HSE risk assessment template.
 *
 * <p>The action can be carried out as a work order. Once that work order is complete, the
 * assessment counts as done; nothing is copied back, the completion is read off the work order.
 */
@Entity
@Data
@NoArgsConstructor
public class RiskAssessment extends CompanyAudit {

    /**
     * What are the hazards?
     */
    @NotNull
    @Column(columnDefinition = "text")
    private String hazard;

    /**
     * Who or what might be harmed, and how?
     */
    @Column(columnDefinition = "text")
    private String whoMightBeHarmed;

    /**
     * What is already being done to control the risk.
     */
    @Column(columnDefinition = "text")
    private String currentControls;

    /**
     * What further action is needed to control the risk.
     */
    @Column(columnDefinition = "text")
    private String furtherAction;

    /**
     * Who needs to carry out the action.
     */
    @ManyToOne
    @Schema(implementation = IdDTO.class)
    private OwnUser actionOwner;

    /**
     * When the action is needed by.
     */
    private Date actionDueDate;

    /**
     * The work order raised to carry out the action, if one was. Set by the attach endpoint.
     */
    @ManyToOne
    @Schema(implementation = IdDTO.class)
    private WorkOrder workOrder;
}
