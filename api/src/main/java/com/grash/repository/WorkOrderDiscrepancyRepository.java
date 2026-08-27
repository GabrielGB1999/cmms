package com.grash.repository;

import com.grash.model.WorkOrderDiscrepancy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;

public interface WorkOrderDiscrepancyRepository extends JpaRepository<WorkOrderDiscrepancy, Long> {
    Collection<WorkOrderDiscrepancy> findByWorkOrder_Id(Long id);
}
