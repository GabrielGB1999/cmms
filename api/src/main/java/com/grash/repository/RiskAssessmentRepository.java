package com.grash.repository;

import com.grash.model.RiskAssessment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;

public interface RiskAssessmentRepository extends JpaRepository<RiskAssessment, Long> {
    Collection<RiskAssessment> findByCompany_IdOrderByCreatedAtDesc(Long id);
}
