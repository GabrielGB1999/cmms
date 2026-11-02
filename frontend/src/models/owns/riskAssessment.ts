import { Audit } from './audit';
import { WorkOrderMini } from './workOrder';
import { UserMiniDTO } from '../user';

/** One row of the safety risk assessment, following the HSE risk assessment template. */
export default interface RiskAssessment extends Audit {
  id: number;
  /** What are the hazards? */
  hazard: string;
  /** Who or what might be harmed, and how? */
  whoMightBeHarmed: string | null;
  /** What is already being done to control the risk. */
  currentControls: string | null;
  /** What further action is needed to control the risk. */
  furtherAction: string | null;
  /** Who needs to carry out the action. */
  actionOwner: UserMiniDTO | null;
  /** When the action is needed by. */
  actionDueDate: string | null;
  /** The work order raised to carry out the action, once one has been. */
  workOrder: WorkOrderMini | null;
  /** When that work order was completed; null until it is. This is the "done" column. */
  completedOn: string | null;
}

/** What the report form sends: the editable fields, with the action owner as a bare id. */
export interface RiskAssessmentPayload {
  hazard: string;
  whoMightBeHarmed: string | null;
  currentControls: string | null;
  furtherAction: string | null;
  actionOwner: { id: number } | null;
  actionDueDate: string | null;
}
