package com.grash.controller;

import com.grash.dto.SuccessResponse;
import com.grash.dto.WorkOrderDiscrepancyPatchDTO;
import com.grash.dto.WorkOrderDiscrepancyShowDTO;
import com.grash.exception.CustomException;
import com.grash.mapper.WorkOrderDiscrepancyMapper;
import com.grash.model.OwnUser;
import com.grash.model.WorkOrder;
import com.grash.model.WorkOrderDiscrepancy;
import com.grash.model.enums.PermissionEntity;
import com.grash.service.UserService;
import com.grash.service.WorkOrderDiscrepancyService;
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
import java.util.Date;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/work-order-discrepancies")
@Tag(name = "workOrderDiscrepancy")
@RequiredArgsConstructor
public class WorkOrderDiscrepancyController {

    private final WorkOrderDiscrepancyService workOrderDiscrepancyService;
    private final WorkOrderDiscrepancyMapper workOrderDiscrepancyMapper;
    private final WorkOrderService workOrderService;
    private final UserService userService;

    @GetMapping("/work-order/{id}")
    @PreAuthorize("permitAll()")
    public Collection<WorkOrderDiscrepancyShowDTO> getByWorkOrder(@PathVariable("id") Long id,
                                                                  HttpServletRequest req) {
        OwnUser user = userService.whoami(req);
        WorkOrder workOrder = workOrderService.findById(id)
                .orElseThrow(() -> new CustomException("Not found", HttpStatus.NOT_FOUND));
        if (!canView(user, workOrder)) throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        return workOrderDiscrepancyService.findByWorkOrder(id).stream()
                .map(workOrderDiscrepancyMapper::toShowDto).collect(Collectors.toList());
    }

    @PostMapping("")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public WorkOrderDiscrepancyShowDTO create(@Valid @RequestBody WorkOrderDiscrepancy workOrderDiscrepancyReq,
                                              HttpServletRequest req) {
        OwnUser user = userService.whoami(req);
        WorkOrder workOrder = workOrderService.findById(workOrderDiscrepancyReq.getWorkOrder().getId())
                .orElseThrow(() -> new CustomException("Work order not found", HttpStatus.NOT_FOUND));
        if (!workOrder.canBeEditedBy(user)) throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        // Recording a discrepancy is work on the work order, so it counts as reacting to it.
        if (workOrder.getFirstTimeToReact() == null) {
            workOrder.setFirstTimeToReact(new Date());
            workOrderService.save(workOrder);
        }
        workOrderDiscrepancyReq.setWorkOrder(workOrder);
        return workOrderDiscrepancyMapper.toShowDto(workOrderDiscrepancyService.create(workOrderDiscrepancyReq));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public WorkOrderDiscrepancyShowDTO patch(@Valid @RequestBody WorkOrderDiscrepancyPatchDTO workOrderDiscrepancy,
                                             @PathVariable("id") Long id, HttpServletRequest req) {
        OwnUser user = userService.whoami(req);
        WorkOrderDiscrepancy saved = findEditable(id, user);
        return workOrderDiscrepancyMapper.toShowDto(workOrderDiscrepancyService.update(id, workOrderDiscrepancy));
    }

    /**
     * Records the work order that was raised to deal with this discrepancy. The work order itself is
     * created through the usual endpoint first, so it goes through the same validation and
     * permissions as any other.
     */
    @PatchMapping("/{id}/derived-work-order/{workOrderId}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public WorkOrderDiscrepancyShowDTO attachDerivedWorkOrder(@PathVariable("id") Long id,
                                                              @PathVariable("workOrderId") Long workOrderId,
                                                              HttpServletRequest req) {
        OwnUser user = userService.whoami(req);
        findEditable(id, user);
        WorkOrder derivedWorkOrder = workOrderService.findById(workOrderId)
                .orElseThrow(() -> new CustomException("Work order not found", HttpStatus.NOT_FOUND));
        return workOrderDiscrepancyMapper.toShowDto(
                workOrderDiscrepancyService.attachDerivedWorkOrder(id, derivedWorkOrder, user));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_CLIENT')")
    public ResponseEntity delete(@PathVariable("id") Long id, HttpServletRequest req) {
        OwnUser user = userService.whoami(req);
        findEditable(id, user);
        workOrderDiscrepancyService.delete(id);
        return new ResponseEntity(new SuccessResponse(true, "Deleted successfully"), HttpStatus.OK);
    }

    private WorkOrderDiscrepancy findEditable(Long id, OwnUser user) {
        WorkOrderDiscrepancy saved = workOrderDiscrepancyService.findById(id)
                .orElseThrow(() -> new CustomException("Discrepancy not found", HttpStatus.NOT_FOUND));
        if (!saved.getWorkOrder().canBeEditedBy(user))
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        return saved;
    }

    private boolean canView(OwnUser user, WorkOrder workOrder) {
        return user.getRole().getViewPermissions().contains(PermissionEntity.WORK_ORDERS)
                && (user.getRole().getViewOtherPermissions().contains(PermissionEntity.WORK_ORDERS)
                || user.getId().equals(workOrder.getCreatedBy())
                || workOrder.isAssignedTo(user));
    }
}
