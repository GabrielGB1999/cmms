import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { AppThunk } from '../store';
import WorkOrderDiscrepancy from '../models/workOrderDiscrepancy';
import api from '../utils/api';
import { revertAll } from '../utils/redux';

const basePath = 'work-order-discrepancies';

interface WorkOrderDiscrepancyState {
  discrepanciesByWorkOrder: { [id: number]: WorkOrderDiscrepancy[] };
  loadingDiscrepancies: { [id: number]: boolean };
}

const initialState: WorkOrderDiscrepancyState = {
  discrepanciesByWorkOrder: {},
  loadingDiscrepancies: {}
};

const slice = createSlice({
  name: 'workOrderDiscrepancies',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    getDiscrepancies(
      state: WorkOrderDiscrepancyState,
      action: PayloadAction<{ id: number; discrepancies: WorkOrderDiscrepancy[] }>
    ) {
      const { discrepancies, id } = action.payload;
      state.discrepanciesByWorkOrder[id] = discrepancies;
    },
    createDiscrepancy(
      state: WorkOrderDiscrepancyState,
      action: PayloadAction<{
        workOrderId: number;
        discrepancy: WorkOrderDiscrepancy;
      }>
    ) {
      const { discrepancy, workOrderId } = action.payload;
      if (state.discrepanciesByWorkOrder[workOrderId]) {
        state.discrepanciesByWorkOrder[workOrderId].push(discrepancy);
      } else state.discrepanciesByWorkOrder[workOrderId] = [discrepancy];
    },
    editDiscrepancy(
      state: WorkOrderDiscrepancyState,
      action: PayloadAction<{
        workOrderId: number;
        discrepancy: WorkOrderDiscrepancy;
      }>
    ) {
      const { discrepancy, workOrderId } = action.payload;
      state.discrepanciesByWorkOrder[workOrderId] = (
        state.discrepanciesByWorkOrder[workOrderId] ?? []
      ).map((item) => (item.id === discrepancy.id ? discrepancy : item));
    },
    deleteDiscrepancy(
      state: WorkOrderDiscrepancyState,
      action: PayloadAction<{ workOrderId: number; id: number }>
    ) {
      const { id, workOrderId } = action.payload;
      state.discrepanciesByWorkOrder[workOrderId] = (
        state.discrepanciesByWorkOrder[workOrderId] ?? []
      ).filter((discrepancy) => discrepancy.id !== id);
    },
    setLoadingByWorkOrder(
      state: WorkOrderDiscrepancyState,
      action: PayloadAction<{ loading: boolean; id: number }>
    ) {
      const { loading, id } = action.payload;
      state.loadingDiscrepancies = {
        ...state.loadingDiscrepancies,
        [id]: loading
      };
    }
  }
});

export const reducer = slice.reducer;

export const getWorkOrderDiscrepancies =
  (id: number): AppThunk =>
  async (dispatch) => {
    dispatch(slice.actions.setLoadingByWorkOrder({ id, loading: true }));
    try {
      const discrepancies = await api.get<WorkOrderDiscrepancy[]>(
        `${basePath}/work-order/${id}`
      );
      dispatch(slice.actions.getDiscrepancies({ id, discrepancies }));
    } catch {
    } finally {
      dispatch(slice.actions.setLoadingByWorkOrder({ id, loading: false }));
    }
  };

export const createWorkOrderDiscrepancy =
  (workOrderId: number, discrepancy: Partial<WorkOrderDiscrepancy>): AppThunk =>
  async (dispatch) => {
    const response = await api.post<WorkOrderDiscrepancy>(basePath, {
      ...discrepancy,
      workOrder: { id: workOrderId }
    });
    dispatch(
      slice.actions.createDiscrepancy({ workOrderId, discrepancy: response })
    );
  };

export const editWorkOrderDiscrepancy =
  (
    workOrderId: number,
    id: number,
    discrepancy: Partial<WorkOrderDiscrepancy>
  ): AppThunk =>
  async (dispatch) => {
    const response = await api.patch<WorkOrderDiscrepancy>(
      `${basePath}/${id}`,
      discrepancy
    );
    dispatch(
      slice.actions.editDiscrepancy({ workOrderId, discrepancy: response })
    );
  };

/**
 * Records the work order raised for this discrepancy. The work order itself is created through the
 * usual endpoint first; this links the two and marks the discrepancy deferred.
 */
export const attachDerivedWorkOrder =
  (workOrderId: number, id: number, derivedWorkOrderId: number): AppThunk =>
  async (dispatch) => {
    const response = await api.patch<WorkOrderDiscrepancy>(
      `${basePath}/${id}/derived-work-order/${derivedWorkOrderId}`,
      {}
    );
    dispatch(
      slice.actions.editDiscrepancy({ workOrderId, discrepancy: response })
    );
  };

export const deleteWorkOrderDiscrepancy =
  (workOrderId: number, id: number): AppThunk =>
  async (dispatch) => {
    await api.deletes<{ success: boolean }>(`${basePath}/${id}`);
    dispatch(slice.actions.deleteDiscrepancy({ workOrderId, id }));
  };
