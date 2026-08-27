import { View } from '../../components/Themed';
import { useTranslation } from 'react-i18next';
import { IField } from '../../models/form';
import * as Yup from 'yup';
import Form from '../../components/form';
import {
  createWorkOrderDiscrepancy,
  editWorkOrderDiscrepancy
} from '../../slices/workOrderDiscrepancy';
import { discrepancyStatuses } from '../../models/workOrderDiscrepancy';
import { RootStackScreenProps } from '../../types';
import { useDispatch } from '../../store';
import { getErrorMessage } from '../../utils/api';
import { useContext } from 'react';
import { CustomSnackBarContext } from '../../contexts/CustomSnackBarContext';

export default function CreateWorkOrderDiscrepancy({
  navigation,
  route
}: RootStackScreenProps<'AddWorkOrderDiscrepancy'>) {
  const { t } = useTranslation();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const dispatch = useDispatch();
  const { workOrderId, discrepancy } = route.params;
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
    <View style={{ flex: 1 }}>
      <Form
        fields={fields}
        navigation={navigation}
        validation={Yup.object().shape(shape)}
        submitText={isEdit ? t('save') : t('add')}
        values={{
          description: discrepancy?.description ?? '',
          correctiveMeasure: discrepancy?.correctiveMeasure ?? '',
          status: {
            label: t(`discrepancy_status_${discrepancy?.status ?? 'OPEN'}`),
            value: discrepancy?.status ?? 'OPEN'
          }
        }}
        onChange={({ field, e }) => {}}
        onSubmit={async (values) => {
          const payload = {
            description: values.description,
            // The API leaves fields it is not sent alone, so an empty string is what clears this.
            correctiveMeasure: values.correctiveMeasure ?? '',
            status: values.status?.value ?? values.status ?? 'OPEN'
          };
          return dispatch(
            isEdit
              ? editWorkOrderDiscrepancy(workOrderId, discrepancy.id, payload)
              : createWorkOrderDiscrepancy(workOrderId, payload)
          )
            .catch((err) => showSnackBar(getErrorMessage(err), 'error'))
            .finally(() => navigation.goBack());
        }}
      />
    </View>
  );
}
