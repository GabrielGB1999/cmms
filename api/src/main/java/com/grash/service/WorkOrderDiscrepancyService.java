package com.grash.service;

import com.grash.dto.WorkOrderDiscrepancyPatchDTO;
import com.grash.exception.CustomException;
import com.grash.mapper.WorkOrderDiscrepancyMapper;
import com.grash.model.OwnUser;
import com.grash.model.Relation;
import com.grash.model.WorkOrder;
import com.grash.model.WorkOrderDiscrepancy;
import com.grash.model.enums.DiscrepancyStatus;
import com.grash.model.enums.RelationTypeInternal;
import com.grash.repository.WorkOrderDiscrepancyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import java.util.Collection;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class WorkOrderDiscrepancyService {

    private final WorkOrderDiscrepancyRepository workOrderDiscrepancyRepository;
    private final WorkOrderDiscrepancyMapper workOrderDiscrepancyMapper;
    private final RelationService relationService;
    private final EntityManager em;

    @Transactional
    public WorkOrderDiscrepancy create(WorkOrderDiscrepancy workOrderDiscrepancy) {
        WorkOrderDiscrepancy saved = workOrderDiscrepancyRepository.saveAndFlush(workOrderDiscrepancy);
        em.refresh(saved);
        return saved;
    }

    @Transactional
    public WorkOrderDiscrepancy update(Long id, WorkOrderDiscrepancyPatchDTO workOrderDiscrepancy) {
        if (workOrderDiscrepancyRepository.existsById(id)) {
            WorkOrderDiscrepancy saved = workOrderDiscrepancyRepository.findById(id).get();
            WorkOrderDiscrepancy updated = workOrderDiscrepancyRepository.saveAndFlush(
                    workOrderDiscrepancyMapper.updateWorkOrderDiscrepancy(saved, workOrderDiscrepancy));
            em.refresh(updated);
            return updated;
        } else throw new CustomException("Not found", HttpStatus.NOT_FOUND);
    }

    /**
     * Attaches a work order raised to deal with this discrepancy, and records the link between the
     * two work orders so each one shows the other under its relations.
     *
     * <p>The relation is built here rather than through {@link RelationService#createPost} because
     * this is not the user hand-linking two arbitrary work orders - it is part of raising the
     * derived work order itself.
     */
    @Transactional
    public WorkOrderDiscrepancy attachDerivedWorkOrder(Long id, WorkOrder derivedWorkOrder, OwnUser user) {
        WorkOrderDiscrepancy discrepancy = workOrderDiscrepancyRepository.findById(id)
                .orElseThrow(() -> new CustomException("Discrepancy not found", HttpStatus.NOT_FOUND));
        if (discrepancy.getDerivedWorkOrder() != null)
            throw new CustomException("This discrepancy already has a derived work order",
                    HttpStatus.NOT_ACCEPTABLE);
        WorkOrder foundOn = discrepancy.getWorkOrder();
        if (foundOn.getId().equals(derivedWorkOrder.getId()))
            throw new CustomException("A discrepancy cannot derive the work order it was found on",
                    HttpStatus.NOT_ACCEPTABLE);

        discrepancy.setDerivedWorkOrder(derivedWorkOrder);
        // Raising a work order for it is what "deferred" means; leave an already resolved one alone.
        if (discrepancy.getStatus() == DiscrepancyStatus.OPEN)
            discrepancy.setStatus(DiscrepancyStatus.DEFERRED);

        if (relationService.findByParentAndChild(foundOn.getId(), derivedWorkOrder.getId()).isEmpty()
                && relationService.findByParentAndChild(derivedWorkOrder.getId(), foundOn.getId()).isEmpty()) {
            Relation relation = Relation.builder()
                    .parent(foundOn)
                    .child(derivedWorkOrder)
                    .relationType(RelationTypeInternal.SPLIT_FROM).build();
            relation.setCompany(user.getCompany());
            relationService.create(relation);
        }
        WorkOrderDiscrepancy saved = workOrderDiscrepancyRepository.saveAndFlush(discrepancy);
        em.refresh(saved);
        return saved;
    }

    public void delete(Long id) {
        workOrderDiscrepancyRepository.deleteById(id);
    }

    public Optional<WorkOrderDiscrepancy> findById(Long id) {
        return workOrderDiscrepancyRepository.findById(id);
    }

    public Collection<WorkOrderDiscrepancy> findByWorkOrder(Long id) {
        return workOrderDiscrepancyRepository.findByWorkOrder_Id(id);
    }
}
