package com.grash.controller;

import com.grash.dto.RiskAssessmentPatchDTO;
import com.grash.dto.RiskAssessmentShowDTO;
import com.grash.dto.SuccessResponse;
import com.grash.exception.CustomException;
import com.grash.mapper.RiskAssessmentMapper;
import com.grash.model.OwnUser;
import com.grash.model.RiskAssessment;
import com.grash.model.WorkOrder;
import com.grash.model.enums.PermissionEntity;
import com.grash.service.RiskAssessmentService;
import com.grash.service.UserService;
import com.grash.service.WorkOrderService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import java.util.Collection;
import java.util.stream.Collectors;

/**
 * The company's safety risk assessments. Anyone in the company can read the register and report a
 * hazard; changing or removing someone else's report takes permission to edit others' work orders,
 * since the register drives corrective work orders.
 */
@RestController
@RequestMapping("/risk-assessments")
@Tag(name = "riskAssessment")
@RequiredArgsConstructor
public class RiskAssessmentController {

    private final RiskAssessmentService riskAssessmentService;
    private final RiskAssessmentMapper riskAssessmentMapper;
    private final WorkOrderService workOrderService;
    private final UserService userService;

    @GetMapping("")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public Collection<RiskAssessmentShowDTO> getAll(HttpServletRequest req) {
        OwnUser user = userService.whoami(req);
        return riskAssessmentService.findByCompany(user.getCompany().getId()).stream()
                .map(riskAssessmentMapper::toShowDto).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public RiskAssessmentShowDTO getById(@PathVariable("id") Long id) {
        return riskAssessmentMapper.toShowDto(find(id));
    }

    @PostMapping("")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public RiskAssessmentShowDTO create(@Valid @RequestBody RiskAssessment riskAssessmentReq,
                                        HttpServletRequest req) {
        OwnUser user = userService.whoami(req);
        checkActionOwner(riskAssessmentReq.getActionOwner(), user);
        if (riskAssessmentReq.getHazard() == null || riskAssessmentReq.getHazard().isBlank())
            throw new CustomException("The hazard is required", HttpStatus.NOT_ACCEPTABLE);
        // The work order is only ever attached through its own endpoint, once it exists.
        riskAssessmentReq.setWorkOrder(null);
        return riskAssessmentMapper.toShowDto(riskAssessmentService.create(riskAssessmentReq));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public RiskAssessmentShowDTO patch(@Valid @RequestBody RiskAssessmentPatchDTO riskAssessment,
                                       @PathVariable("id") Long id, HttpServletRequest req) {
        OwnUser user = userService.whoami(req);
        RiskAssessment saved = findEditable(id, user);
        checkActionOwner(riskAssessment.getActionOwner(), user);
        return riskAssessmentMapper.toShowDto(riskAssessmentService.update(saved, riskAssessment));
    }

    /**
     * Records the work order that was raised to carry out this assessment's action. Once that work
     * order is completed, the assessment shows as done.
     */
    @PatchMapping("/{id}/work-order/{workOrderId}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public RiskAssessmentShowDTO attachWorkOrder(@PathVariable("id") Long id,
                                                 @PathVariable("workOrderId") Long workOrderId,
                                                 HttpServletRequest req) {
        OwnUser user = userService.whoami(req);
        RiskAssessment saved = find(id);
        WorkOrder workOrder = workOrderService.findById(workOrderId)
                .orElseThrow(() -> new CustomException("Work order not found", HttpStatus.NOT_FOUND));
        if (!workOrder.canBeEditedBy(user))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        return riskAssessmentMapper.toShowDto(riskAssessmentService.attachWorkOrder(saved, workOrder));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity delete(@PathVariable("id") Long id, HttpServletRequest req) {
        OwnUser user = userService.whoami(req);
        findEditable(id, user);
        riskAssessmentService.delete(id);
        return new ResponseEntity(new SuccessResponse(true, "Deleted successfully"), HttpStatus.OK);
    }

    /**
     * The action owner comes in as a bare id; make sure it is someone from the user's own company.
     */
    private void checkActionOwner(OwnUser actionOwner, OwnUser user) {
        if (actionOwner == null) return;
        if (actionOwner.getId() == null
                || userService.findByIdAndCompany(actionOwner.getId(), user.getCompany().getId()).isEmpty())
            throw new CustomException("Action owner not found", HttpStatus.NOT_FOUND);
    }

    private RiskAssessment find(Long id) {
        // Loading another company's row throws in CompanyAudit#afterLoad.
        return riskAssessmentService.findById(id)
                .orElseThrow(() -> new CustomException("Risk assessment not found", HttpStatus.NOT_FOUND));
    }

    private RiskAssessment findEditable(Long id, OwnUser user) {
        RiskAssessment saved = find(id);
        if (!user.getId().equals(saved.getCreatedBy())
                && !user.getRole().getEditOtherPermissions().contains(PermissionEntity.WORK_ORDERS))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        return saved;
    }
}
