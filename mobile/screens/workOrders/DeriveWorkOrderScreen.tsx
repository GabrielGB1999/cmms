import { RootStackScreenProps } from '../../types';
import { View } from '../../components/Themed';
import Form from '../../components/form';
import * as Yup from 'yup';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { IField } from '../../models/form';
import { useContext } from 'react';
import { useDispatch } from '../../store';
import { addWorkOrder } from '../../slices/workOrder';
import { attachDerivedWorkOrder } from '../../slices/workOrderDiscrepancy';
import { CustomSnackBarContext } from '../../contexts/CustomSnackBarContext';
import { formatWorkOrderValues } from '../../utils/fields';
import { getErrorMessage } from '../../utils/api';

/** Turns {id, name} into the {label, value} shape the shared select fields expect. */
const toOption = (entity: { id: number; name?: string } | null | undefined) =>
  entity ? { label: entity.name, value: entity.id.toString() } : null;

export default function DeriveWorkOrderScreen({
  navigation,
  route
}: RootStackScreenProps<'DeriveWorkOrder'>) {
  const { t } = useTranslation();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const dispatch = useDispatch();
  const { workOrder, discrepancy } = route.params;

  const fields: Array<IField> = [
    { name: 'title', type: 'text', label: t('title'), required: true },
    {
      name: 'description',
      type: 'text',
      label: t('description'),
      multiple: true
    },
    {
      name: 'priority',
      type: 'select',
      type2: 'priority',
      label: t('priority'),
      midWidth: true
    },
    { name: 'dueDate', type: 'date', label: t('due_date'), midWidth: true },
    {
      name: 'primaryUser',
      type: 'select',
      type2: 'user',
      label: t('primary_worker'),
      midWidth: true
    },
    {
      name: 'team',
      type: 'select',
      type2: 'team',
      label: t('team'),
      midWidth: true
    },
    {
      name: 'location',
      type: 'select',
      type2: 'location',
      label: t('location'),
      midWidth: true
    },
    {
      name: 'asset',
      type: 'select',
      type2: 'asset',
      label: t('asset'),
      midWidth: true
    }
  ];
  const shape = { title: Yup.string().required(t('required_wo_title')) };

  return (
    <View style={styles.container}>
      <Form
        fields={fields}
        navigation={navigation}
        validation={Yup.object().shape(shape)}
        submitText={t('save')}
        // Everything the technician would otherwise retype: the squawk itself, and the context of
        // the work order it was found on.
        values={{
          title: discrepancy.description.split('\n')[0].slice(0, 80),
          description: t('derived_from_discrepancy', {
            workOrder: workOrder.title,
            description: discrepancy.description
          }),
          team: toOption(workOrder.team),
          location: toOption(workOrder.location),
          asset: toOption(workOrder.asset)
        }}
        onChange={({ field, e }) => {}}
        onSubmit={async (values) => {
          const formattedValues = formatWorkOrderValues(values);
          try {
            const derivedWorkOrderId = await dispatch(
              addWorkOrder(formattedValues)
            );
            await dispatch(
              attachDerivedWorkOrder(
                workOrder.id,
                discrepancy.id,
                derivedWorkOrderId as number
              )
            );
            showSnackBar(t('derived_work_order_success'), 'success');
            navigation.goBack();
          } catch (err) {
            showSnackBar(getErrorMessage(err), 'error');
            throw err;
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});
