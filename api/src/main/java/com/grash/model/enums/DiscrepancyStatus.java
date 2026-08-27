package com.grash.model.enums;

public enum DiscrepancyStatus {
    /**
     * Found and recorded, nothing done about it yet.
     */
    OPEN,
    /**
     * Dealt with during the procedure; the corrective measure says how.
     */
    CORRECTED,
    /**
     * Not fixed here, carried over to another work order.
     */
    DEFERRED
}
