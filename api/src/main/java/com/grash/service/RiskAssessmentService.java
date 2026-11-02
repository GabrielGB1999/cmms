package com.grash.service;

import com.grash.dto.RiskAssessmentPatchDTO;
import com.grash.exception.CustomException;
import com.grash.mapper.RiskAssessmentMapper;
import com.grash.model.RiskAssessment;
import com.grash.model.WorkOrder;
import com.grash.repository.RiskAssessmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import java.util.Collection;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RiskAssessmentService {

    private final RiskAssessmentRepository riskAssessmentRepository;
    private final RiskAssessmentMapper riskAssessmentMapper;
    private final EntityManager em;

    @Transactional
    public RiskAssessment create(RiskAssessment riskAssessment) {
        RiskAssessment saved = riskAssessmentRepository.saveAndFlush(riskAssessment);
        em.refresh(saved);
        return saved;
    }

    @Transactional
    public RiskAssessment update(RiskAssessment saved, RiskAssessmentPatchDTO riskAssessment) {
        RiskAssessment updated = riskAssessmentRepository.saveAndFlush(
                riskAssessmentMapper.updateRiskAssessment(saved, riskAssessment));
        em.refresh(updated);
        return updated;
    }

    /**
     * Records the work order raised to carry out the assessment's action. The work order is created
     * through the usual endpoint first, so it goes through the same validation and permissions as
     * any other.
     */
    @Transactional
    public RiskAssessment attachWorkOrder(RiskAssessment riskAssessment, WorkOrder workOrder) {
        if (riskAssessment.getWorkOrder() != null)
            throw new CustomException("This risk assessment already has a work order", HttpStatus.NOT_ACCEPTABLE);
        riskAssessment.setWorkOrder(workOrder);
        RiskAssessment saved = riskAssessmentRepository.saveAndFlush(riskAssessment);
        em.refresh(saved);
        return saved;
    }

    public void delete(Long id) {
        riskAssessmentRepository.deleteById(id);
    }

    public Optional<RiskAssessment> findById(Long id) {
        return riskAssessmentRepository.findById(id);
    }

    public Collection<RiskAssessment> findByCompany(Long id) {
        return riskAssessmentRepository.findByCompany_IdOrderByCreatedAtDesc(id);
    }
}
