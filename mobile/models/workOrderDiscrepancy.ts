import { Audit } from './audit';
import { WorkOrderStatus } from './workOrder';

export type DiscrepancyStatus = 'OPEN' | 'CORRECTED' | 'DEFERRED';

export const discrepancyStatuses: DiscrepancyStatus[] = [
  'OPEN',
  'CORRECTED',
  'DEFERRED'
];

export default interface WorkOrderDiscrepancy extends Audit {
  id: number;
  description: string;
  correctiveMeasure: string | null;
  status: DiscrepancyStatus;
  /** The work order raised to deal with this discrepancy, once one has been. */
  derivedWorkOrder: {
    id: number;
    title: string;
    customId: string;
    status: WorkOrderStatus;
  } | null;
}
