import { Dialog, DialogContent, DialogTitle, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import Form from '../../components/form';
import * as Yup from 'yup';
import { IField } from '../../type';
import { useContext } from 'react';
import { useDispatch } from '../../../../store';
import {
  createWorkOrderDiscrepancy,
  editWorkOrderDiscrepancy
} from '../../../../slices/workOrderDiscrepancy';
import WorkOrderDiscrepancy, {
  discrepancyStatuses
} from '../../../../models/owns/workOrderDiscrepancy';
import { getErrorMessage } from '../../../../utils/api';
import { CustomSnackBarContext } from '../../../../contexts/CustomSnackBarContext';

interface DiscrepancyModalProps {
  open: boolean;
  onClose: () => void;
  workOrderId: number;
  /** Passing one switches the dialog to editing that discrepancy. */
  discrepancy?: WorkOrderDiscrepancy;
}

export default function DiscrepancyModal({
  open,
  onClose,
  workOrderId,
  discrepancy
}: DiscrepancyModalProps) {
  const { t }: { t: any } = useTranslation();
  const dispatch = useDispatch();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const isEdit = !!discrepancy;

  const fields: Array<IField> = [
    {
      name: 'description',
      type: 'text',
      label: t('discrepancy_description'),
      placeholder: t('discrepancy_description_placeholder'),
      multiple: true,
      required: true
    },
    {
      name: 'correctiveMeasure',
      type: 'text',
      label: t('corrective_measure'),
      placeholder: t('corrective_measure_placeholder'),
      multiple: true
    },
    {
      name: 'status',
      type: 'select',
      label: t('status'),
      items: discrepancyStatuses.map((status) => ({
        label: t(`discrepancy_status_${status}`),
        value: status
      }))
    }
  ];
  const shape = {
    description: Yup.string().required(t('required_discrepancy_description'))
  };

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={onClose}>
      <DialogTitle sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {isEdit ? t('edit_discrepancy') : t('add_discrepancy')}
        </Typography>
        <Typography variant="subtitle2">
          {t('add_discrepancy_description')}
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 3 }}>
        <Form
          fields={fields}
          validation={Yup.object().shape(shape)}
          submitText={isEdit ? t('save') : t('add')}
          values={{
            description: discrepancy?.description ?? '',
            correctiveMeasure: discrepancy?.correctiveMeasure ?? '',
            status: {
              label: t(
                `discrepancy_status_${discrepancy?.status ?? 'OPEN'}`
              ),
              value: discrepancy?.status ?? 'OPEN'
            }
          }}
          onChange={({ field, e }) => {}}
          onSubmit={async (values) => {
            const payload = {
              description: values.description,
              // The API leaves fields it is not sent alone, so an empty string is what clears this.
              correctiveMeasure: values.correctiveMeasure ?? '',
              // A plain enum select yields {label, value}, unlike entity selects.
              status: values.status?.value ?? values.status ?? 'OPEN'
            };
            return dispatch(
              isEdit
                ? editWorkOrderDiscrepancy(workOrderId, discrepancy.id, payload)
                : createWorkOrderDiscrepancy(workOrderId, payload)
            )
              .then(onClose)
              .catch((err) => showSnackBar(getErrorMessage(err), 'error'));
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
