import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useContext } from 'react';
import * as Yup from 'yup';
import useMobile from 'src/hooks/useMobile';
import Form from '../components/form';
import { useDispatch } from '../../../store';
import { addWorkOrder } from '../../../slices/workOrder';
import { attachWorkOrderToRiskAssessment } from '../../../slices/riskAssessment';
import RiskAssessment from '../../../models/owns/riskAssessment';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';
import { CompanySettingsContext } from '../../../contexts/CompanySettingsContext';
import { getErrorMessage } from '../../../utils/api';
import { getImageAndFiles } from '../../../utils/overall';
import {
  formatWorkOrderValues,
  getWorkOrderFields,
  getWorkOrderShape
} from '../WorkOrders/workOrderForm';

interface CreateWorkOrderModalProps {
  open: boolean;
  onClose: () => void;
  riskAssessment: RiskAssessment;
}

/**
 * The regular work order form, pre-filled from a risk assessment: titled as its corrective action and
 * assigned to whoever should carry it out. The new work order is linked back to the assessment, which
 * shows as done once the work order is completed.
 */
export default function CreateWorkOrderModal({
  open,
  onClose,
  riskAssessment
}: CreateWorkOrderModalProps) {
  const { t }: { t: any } = useTranslation();
  const isMobile = useMobile();
  const dispatch = useDispatch();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const { uploadFiles, getWOFieldsAndShapes } = useContext(
    CompanySettingsContext
  );
  const [fields, shape] = getWOFieldsAndShapes(
    getWorkOrderFields(t),
    getWorkOrderShape(t)
  );

  const { hazard, furtherAction, actionOwner, actionDueDate } = riskAssessment;
  const initialValues = {
    requiredSignature: false,
    title: t('corrective_action_title', {
      hazard: hazard.split('\n')[0].slice(0, 200)
    }),
    description: furtherAction ?? '',
    dueDate: actionDueDate,
    primaryUser: actionOwner
      ? {
          label: `${actionOwner.firstName} ${actionOwner.lastName}`,
          value: actionOwner.id.toString()
        }
      : null
  };

  return (
    <Dialog
      fullWidth
      maxWidth="md"
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
    >
      <DialogTitle sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {t('add_wo')}
        </Typography>
        <Typography variant="subtitle2">
          {t('risk_assessment_to_wo_description')}
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 3 }}>
        <Box>
          <Form
            fields={fields}
            validation={Yup.object().shape(shape)}
            submitText={t('add')}
            values={initialValues}
            onChange={({ field, e }) => {}}
            onSubmit={async (values) => {
              let formattedValues = formatWorkOrderValues(values);
              try {
                const uploadedFiles = await uploadFiles(
                  formattedValues.files,
                  formattedValues.image
                );
                const imageAndFiles = getImageAndFiles(uploadedFiles);
                formattedValues = {
                  ...formattedValues,
                  image: imageAndFiles.image,
                  files: imageAndFiles.files
                };
                const workOrderId = await dispatch(
                  addWorkOrder(formattedValues)
                );
                await dispatch(
                  attachWorkOrderToRiskAssessment(
                    riskAssessment.id,
                    workOrderId as number
                  )
                );
                showSnackBar(t('risk_assessment_wo_success'), 'success');
                onClose();
              } catch (err) {
                showSnackBar(
                  getErrorMessage(err, t('wo_create_failure')),
                  'error'
                );
                throw err;
              }
            }}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
}
