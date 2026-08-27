import { Box, Dialog, DialogContent, DialogTitle, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import useMobile from 'src/hooks/useMobile';
import Form from '../../components/form';
import * as Yup from 'yup';
import { IField } from '../../type';
import { useContext } from 'react';
import { useDispatch } from '../../../../store';
import { addWorkOrder } from '../../../../slices/workOrder';
import { attachDerivedWorkOrder } from '../../../../slices/workOrderDiscrepancy';
import WorkOrder from '../../../../models/owns/workOrder';
import WorkOrderDiscrepancy from '../../../../models/owns/workOrderDiscrepancy';
import { getErrorMessage } from '../../../../utils/api';
import { CustomSnackBarContext } from '../../../../contexts/CustomSnackBarContext';
import {
  formatSelect,
  formatSelectMultiple
} from '../../../../utils/formatters';
import { getPriorityLabel } from '../../../../utils/formatters';

interface DeriveWorkOrderModalProps {
  open: boolean;
  onClose: () => void;
  /** The work order the discrepancy was found on; the new one inherits its context. */
  workOrder: WorkOrder;
  discrepancy: WorkOrderDiscrepancy;
}

/** Turns {id, name} into the {label, value} shape the shared select fields expect. */
const toOption = (entity: { id: number; name?: string } | null | undefined) =>
  entity ? { label: entity.name, value: entity.id } : null;

export default function DeriveWorkOrderModal({
  open,
  onClose,
  workOrder,
  discrepancy
}: DeriveWorkOrderModalProps) {
  const { t }: { t: any } = useTranslation();
  const isMobile = useMobile();
  const dispatch = useDispatch();
  const { showSnackBar } = useContext(CustomSnackBarContext);

  const fields: Array<IField> = [
    { name: 'title', type: 'text', label: t('title'), required: true },
    {
      name: 'description',
      type: 'text',
      label: t('description'),
      multiple: true
    },
    { name: 'priority', type: 'select', type2: 'priority', label: t('priority'), midWidth: true },
    { name: 'dueDate', type: 'date', label: t('due_date'), midWidth: true },
    { name: 'primaryUser', type: 'select', type2: 'user', label: t('primary_worker'), midWidth: true },
    { name: 'team', type: 'select', type2: 'team', label: t('team'), midWidth: true },
    { name: 'location', type: 'select', type2: 'location', label: t('location'), midWidth: true },
    {
      name: 'asset',
      type: 'select',
      type2: 'asset',
      label: t('asset'),
      midWidth: true,
      relatedFields: [{ field: 'location' }]
    },
    {
      name: 'assignedTo',
      type: 'select',
      type2: 'user',
      label: t('additional_workers'),
      multiple: true
    }
  ];
  const shape = { title: Yup.string().required(t('required_wo_title')) };

  // Everything the technician would otherwise retype: the squawk itself, and the context of the
  // work order it was found on.
  const initialValues = {
    title: discrepancy.description.split('\n')[0].slice(0, 80),
    description: t('derived_from_discrepancy', {
      workOrder: workOrder.title,
      description: discrepancy.description
    }),
    priority: workOrder.priority
      ? { label: getPriorityLabel(workOrder.priority, t), value: workOrder.priority }
      : null,
    primaryUser: workOrder.primaryUser
      ? {
          label: `${workOrder.primaryUser.firstName} ${workOrder.primaryUser.lastName}`,
          value: workOrder.primaryUser.id
        }
      : null,
    team: toOption(workOrder.team),
    location: toOption(workOrder.location),
    asset: toOption(workOrder.asset)
  };

  return (
    <Dialog fullWidth maxWidth="md" open={open} onClose={onClose} fullScreen={isMobile}>
      <DialogTitle sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {t('derive_work_order')}
        </Typography>
        <Typography variant="subtitle2">
          {t('derive_work_order_description')}
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 3 }}>
        <Box>
          <Form
            fields={fields}
            validation={Yup.object().shape(shape)}
            submitText={t('create')}
            values={initialValues}
            onChange={({ field, e }) => {}}
            onSubmit={async (values) => {
              const payload = {
                ...values,
                priority: values.priority?.value ?? 'NONE',
                primaryUser: formatSelect(values.primaryUser),
                team: formatSelect(values.team),
                location: formatSelect(values.location),
                asset: formatSelect(values.asset),
                assignedTo: formatSelectMultiple(values.assignedTo)
              };
              try {
                const derivedWorkOrderId = await dispatch(addWorkOrder(payload));
                await dispatch(
                  attachDerivedWorkOrder(
                    workOrder.id,
                    discrepancy.id,
                    derivedWorkOrderId as number
                  )
                );
                showSnackBar(t('derived_work_order_success'), 'success');
                onClose();
              } catch (err) {
                showSnackBar(getErrorMessage(err), 'error');
                throw err;
              }
            }}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
}
