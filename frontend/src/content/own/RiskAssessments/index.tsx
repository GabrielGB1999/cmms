import { Helmet } from 'react-helmet-async';
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useContext, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import * as Yup from 'yup';
import AddTwoToneIcon from '@mui/icons-material/AddTwoTone';
import EditTwoToneIcon from '@mui/icons-material/EditTwoTone';
import DeleteTwoToneIcon from '@mui/icons-material/DeleteTwoTone';
import AssignmentTwoToneIcon from '@mui/icons-material/AssignmentTwoTone';
import CheckCircleTwoToneIcon from '@mui/icons-material/CheckCircleTwoTone';
import useMobile from 'src/hooks/useMobile';
import Form from '../components/form';
import { IField } from '../type';
import ConfirmDialog from '../components/ConfirmDialog';
import { TitleContext } from '../../../contexts/TitleContext';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';
import { CompanySettingsContext } from '../../../contexts/CompanySettingsContext';
import { useDispatch, useSelector } from '../../../store';
import {
  addRiskAssessment,
  deleteRiskAssessment,
  editRiskAssessment,
  getRiskAssessments
} from '../../../slices/riskAssessment';
import RiskAssessment from '../../../models/owns/riskAssessment';
import useAuth from '../../../hooks/useAuth';
import { PermissionEntity } from '../../../models/owns/role';
import { formatSelect } from '../../../utils/formatters';
import { getErrorMessage } from '../../../utils/api';
import CreateWorkOrderModal from './CreateWorkOrderModal';

/**
 * The safety risk assessment register: one row per reported hazard, laid out like the HSE risk
 * assessment template. Each row's further action can be turned into a work order, and the row reads
 * as done once that work order is completed.
 */
function RiskAssessments() {
  const { t }: { t: any } = useTranslation();
  const isMobile = useMobile();
  const dispatch = useDispatch();
  const { setTitle } = useContext(TitleContext);
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const { getFormattedDate } = useContext(CompanySettingsContext);
  const { hasCreatePermission, hasEditPermission } = useAuth();
  const { riskAssessments, loadingGet } = useSelector(
    (state) => state.riskAssessments
  );

  const [openFormModal, setOpenFormModal] = useState<boolean>(false);
  // The assessment being edited; undefined while reporting a new one.
  const [editing, setEditing] = useState<RiskAssessment>();
  const [toWorkOrder, setToWorkOrder] = useState<RiskAssessment>();
  const [toDelete, setToDelete] = useState<RiskAssessment>();

  useEffect(() => {
    setTitle(t('risk_assessment'));
    dispatch(getRiskAssessments());
  }, []);

  const canCreateWorkOrder = hasCreatePermission(PermissionEntity.WORK_ORDERS);
  // Same rule as the API: your own reports, or anyone's if you can edit others' work orders.
  const canEdit = (riskAssessment: RiskAssessment) =>
    hasEditPermission(PermissionEntity.WORK_ORDERS, riskAssessment);

  const fields: Array<IField> = [
    {
      name: 'hazard',
      type: 'text',
      label: t('ra_hazard'),
      placeholder: t('ra_hazard_placeholder'),
      multiple: true,
      required: true
    },
    {
      name: 'whoMightBeHarmed',
      type: 'text',
      label: t('ra_who_might_be_harmed'),
      placeholder: t('ra_who_might_be_harmed_placeholder'),
      multiple: true
    },
    {
      name: 'currentControls',
      type: 'text',
      label: t('ra_current_controls'),
      placeholder: t('ra_current_controls_placeholder'),
      multiple: true
    },
    {
      name: 'furtherAction',
      type: 'text',
      label: t('ra_further_action'),
      placeholder: t('ra_further_action_placeholder'),
      multiple: true
    },
    {
      name: 'actionOwner',
      type: 'select',
      type2: 'user',
      label: t('ra_action_owner'),
      midWidth: true
    },
    {
      name: 'actionDueDate',
      type: 'date',
      label: t('ra_action_due_date'),
      midWidth: true
    }
  ];
  const shape = {
    hazard: Yup.string().trim().required(t('ra_required_hazard'))
  };

  const getInitialValues = (riskAssessment?: RiskAssessment) =>
    riskAssessment
      ? {
          hazard: riskAssessment.hazard,
          whoMightBeHarmed: riskAssessment.whoMightBeHarmed ?? '',
          currentControls: riskAssessment.currentControls ?? '',
          furtherAction: riskAssessment.furtherAction ?? '',
          actionOwner: riskAssessment.actionOwner
            ? {
                label: `${riskAssessment.actionOwner.firstName} ${riskAssessment.actionOwner.lastName}`,
                value: riskAssessment.actionOwner.id.toString()
              }
            : null,
          actionDueDate: riskAssessment.actionDueDate
        }
      : {};

  const closeFormModal = () => {
    setOpenFormModal(false);
    setEditing(undefined);
  };

  const onSubmit = async (values) => {
    const payload = {
      hazard: values.hazard,
      whoMightBeHarmed: values.whoMightBeHarmed || null,
      currentControls: values.currentControls || null,
      furtherAction: values.furtherAction || null,
      actionOwner: formatSelect(values.actionOwner),
      actionDueDate: values.actionDueDate ?? null
    };
    try {
      if (editing) {
        await dispatch(editRiskAssessment(editing.id, payload));
        showSnackBar(t('changes_saved_success'), 'success');
      } else {
        await dispatch(addRiskAssessment(payload));
        showSnackBar(t('ra_create_success'), 'success');
      }
      closeFormModal();
    } catch (err) {
      showSnackBar(getErrorMessage(err, t('ra_save_failure')), 'error');
      throw err;
    }
  };

  const onDelete = async () => {
    try {
      await dispatch(deleteRiskAssessment(toDelete.id));
      showSnackBar(t('ra_delete_success'), 'success');
    } catch (err) {
      showSnackBar(getErrorMessage(err, t('ra_save_failure')), 'error');
    } finally {
      setToDelete(undefined);
    }
  };

  const workOrderLabel = (riskAssessment: RiskAssessment) =>
    `#${riskAssessment.workOrder.customId ?? riskAssessment.workOrder.id}`;

  const renderWorkOrderLink = (riskAssessment: RiskAssessment) => (
    <Link
      component={RouterLink}
      to={`/app/work-orders/${riskAssessment.workOrder.id}`}
      underline="hover"
    >
      {t('work_order')} {workOrderLabel(riskAssessment)}
    </Link>
  );

  const renderDone = (riskAssessment: RiskAssessment) => {
    if (riskAssessment.completedOn)
      return (
        <Stack spacing={0.5} alignItems="flex-start">
          <Chip
            size="small"
            color="success"
            icon={<CheckCircleTwoToneIcon />}
            label={getFormattedDate(riskAssessment.completedOn, true)}
          />
          {renderWorkOrderLink(riskAssessment)}
        </Stack>
      );
    if (riskAssessment.workOrder)
      return (
        <Stack spacing={0.5} alignItems="flex-start">
          <Chip size="small" color="warning" label={t('pending')} />
          {renderWorkOrderLink(riskAssessment)}
        </Stack>
      );
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    );
  };

  const renderText = (text: string | null) => (
    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
      {text || '—'}
    </Typography>
  );

  const columns: { label: string; minWidth: number }[] = [
    { label: t('ra_hazard'), minWidth: 160 },
    { label: t('ra_who_might_be_harmed'), minWidth: 140 },
    { label: t('ra_current_controls'), minWidth: 150 },
    { label: t('ra_further_action'), minWidth: 160 },
    { label: t('ra_action_owner'), minWidth: 110 },
    { label: t('ra_action_due_date'), minWidth: 100 },
    { label: t('ra_done'), minWidth: 130 },
    { label: t('actions'), minWidth: 160 }
  ];

  return (
    <>
      <Helmet>
        <title>{t('risk_assessment')}</title>
      </Helmet>
      <Dialog
        fullWidth
        maxWidth="md"
        open={openFormModal}
        onClose={closeFormModal}
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            {editing ? t('ra_edit_report') : t('ra_new_report')}
          </Typography>
          <Typography variant="subtitle2">
            {t('ra_new_report_description')}
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <Box>
            <Form
              fields={fields}
              validation={Yup.object().shape(shape)}
              submitText={editing ? t('save') : t('ra_report')}
              values={getInitialValues(editing)}
              onChange={({ field, e }) => {}}
              onSubmit={onSubmit}
            />
          </Box>
        </DialogContent>
      </Dialog>
      {toWorkOrder && (
        <CreateWorkOrderModal
          open={!!toWorkOrder}
          onClose={() => setToWorkOrder(undefined)}
          riskAssessment={toWorkOrder}
        />
      )}
      <ConfirmDialog
        open={!!toDelete}
        onCancel={() => setToDelete(undefined)}
        onConfirm={onDelete}
        confirmText={t('to_delete')}
        question={t('ra_confirm_delete')}
      />
      <Box
        justifyContent="center"
        alignItems="stretch"
        paddingX={isMobile ? 2 : 4}
      >
        <Stack
          my={1}
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          spacing={1}
        >
          <Typography variant="subtitle2" color="text.secondary">
            {t('ra_description')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddTwoToneIcon />}
            onClick={() => {
              setEditing(undefined);
              setOpenFormModal(true);
            }}
            sx={{ flexShrink: 0 }}
          >
            {t('ra_new_report')}
          </Button>
        </Stack>
        <Card>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell
                      key={column.label}
                      sx={{
                        minWidth: column.minWidth,
                        verticalAlign: 'bottom'
                      }}
                    >
                      {column.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingGet && !riskAssessments.length ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} align="center">
                      <CircularProgress size="1.5rem" />
                    </TableCell>
                  </TableRow>
                ) : !riskAssessments.length ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} align="center">
                      <Typography variant="body2" color="text.secondary" py={3}>
                        {t('ra_no_reports')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  riskAssessments.map((riskAssessment) => (
                    <TableRow
                      key={riskAssessment.id}
                      sx={{ verticalAlign: 'top' }}
                    >
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {renderText(riskAssessment.hazard)}
                      </TableCell>
                      <TableCell>
                        {renderText(riskAssessment.whoMightBeHarmed)}
                      </TableCell>
                      <TableCell>
                        {renderText(riskAssessment.currentControls)}
                      </TableCell>
                      <TableCell>
                        {renderText(riskAssessment.furtherAction)}
                      </TableCell>
                      <TableCell>
                        {renderText(
                          riskAssessment.actionOwner
                            ? `${riskAssessment.actionOwner.firstName} ${riskAssessment.actionOwner.lastName}`
                            : null
                        )}
                      </TableCell>
                      <TableCell>
                        {renderText(
                          getFormattedDate(riskAssessment.actionDueDate, true)
                        )}
                      </TableCell>
                      <TableCell>{renderDone(riskAssessment)}</TableCell>
                      <TableCell>
                        <Stack spacing={1} alignItems="flex-start">
                          {!riskAssessment.workOrder && canCreateWorkOrder && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<AssignmentTwoToneIcon />}
                              onClick={() => setToWorkOrder(riskAssessment)}
                            >
                              {t('ra_to_work_order')}
                            </Button>
                          )}
                          {canEdit(riskAssessment) && (
                            <Stack direction="row">
                              <Tooltip title={t('edit')}>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => {
                                    setEditing(riskAssessment);
                                    setOpenFormModal(true);
                                  }}
                                >
                                  <EditTwoToneIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t('to_delete')}>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => setToDelete(riskAssessment)}
                                >
                                  <DeleteTwoToneIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Box>
    </>
  );
}

export default RiskAssessments;
