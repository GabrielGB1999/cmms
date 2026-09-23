import * as Yup from 'yup';
import { IField } from '../type';
import { assetStatuses } from '../../../models/owns/asset';
import { formatSelect, formatSelectMultiple } from '../../../utils/formatters';

/**
 * The create/edit work order form, shared by the work orders screen and anything else that raises a
 * work order (risk assessments). Pass the result through CompanySettingsContext's
 * getWOFieldsAndShapes so the company's field configuration applies.
 */
export const getWorkOrderFields = (t: any): Array<IField> => [
  {
    name: 'title',
    type: 'text',
    label: t('title'),
    placeholder: t('wo.title_description'),
    required: true
  },
  {
    name: 'description',
    type: 'text',
    label: t('description'),
    placeholder: t('description'),
    multiple: true
  },
  {
    name: 'image',
    type: 'file',
    fileType: 'image',
    label: t('image')
  },
  {
    name: 'dueDate',
    type: 'date',
    label: t('due_date')
  },
  {
    name: 'estimatedStartDate',
    type: 'date',
    label: t('estimated_start_date')
  },
  {
    name: 'estimatedDuration',
    type: 'number',
    label: t('estimated_duration'),
    placeholder: t('hours')
  },
  {
    name: 'priority',
    type: 'select',
    label: t('priority'),
    type2: 'priority'
  },
  {
    name: 'category',
    type: 'select',
    label: t('category'),
    type2: 'category',
    category: 'work-order-categories'
  },
  {
    name: 'primaryUser',
    type: 'select',
    label: t('primary_worker'),
    type2: 'user'
  },
  {
    name: 'assignedTo',
    type: 'select',
    label: t('additional_workers'),
    type2: 'user',
    multiple: true
  },
  {
    name: 'customers',
    type: 'select',
    label: t('customers'),
    type2: 'customer',
    multiple: true
  },
  {
    name: 'team',
    type: 'select',
    type2: 'team',
    label: t('team'),
    placeholder: t('select_team')
  },
  {
    name: 'location',
    type: 'select',
    type2: 'location',
    label: t('location'),
    placeholder: t('select_location')
  },
  {
    name: 'asset',
    type: 'select',
    type2: 'asset',
    label: t('asset'),
    placeholder: t('select_asset'),
    relatedFields: [{ field: 'location' }]
  },
  {
    name: 'assetStatus',
    type: 'select',
    label: t('asset_status'),
    placeholder: t('select_asset_status'),
    items: assetStatuses.map((assetStatus) => ({
      label: t(assetStatus.status),
      value: assetStatus.status
    }))
  },
  {
    name: 'tasks',
    type: 'select',
    type2: 'task',
    label: t('tasks'),
    placeholder: t('select_tasks')
  },
  {
    name: 'files',
    type: 'file',
    multiple: true,
    label: t('files'),
    fileType: 'file'
  },
  {
    name: 'requiredSignature',
    type: 'switch',
    label: t('requires_signature')
  }
];

export const getWorkOrderShape = (t: any): { [key: string]: any } => ({
  title: Yup.string().required(t('required_wo_title'))
});

/** Turns the form's {label, value} selects into the payload the API expects. */
export const formatWorkOrderValues = (values) => {
  const newValues = { ...values };
  newValues.assetStatus = newValues.assetStatus?.value ?? null;
  newValues.primaryUser = formatSelect(newValues.primaryUser);
  newValues.location = formatSelect(newValues.location);
  newValues.team = formatSelect(newValues.team);
  newValues.asset = formatSelect(newValues.asset);
  newValues.assignedTo = formatSelectMultiple(newValues.assignedTo);
  newValues.customers = formatSelectMultiple(newValues.customers);
  newValues.priority = newValues.priority ? newValues.priority.value : 'NONE';
  newValues.requiredSignature = Array.isArray(newValues.requiredSignature)
    ? newValues?.requiredSignature.includes('on')
    : newValues.requiredSignature;
  newValues.category = formatSelect(newValues.category);
  return newValues;
};
