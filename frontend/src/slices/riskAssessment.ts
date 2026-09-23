import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { AppThunk } from 'src/store';
import RiskAssessment, {
  RiskAssessmentPayload
} from '../models/owns/riskAssessment';
import api from '../utils/api';
import { revertAll } from 'src/utils/redux';

const basePath = 'risk-assessments';

interface RiskAssessmentState {
  riskAssessments: RiskAssessment[];
  loadingGet: boolean;
}

const initialState: RiskAssessmentState = {
  riskAssessments: [],
  loadingGet: false
};

const slice = createSlice({
  name: 'riskAssessments',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    getRiskAssessments(
      state: RiskAssessmentState,
      action: PayloadAction<{ riskAssessments: RiskAssessment[] }>
    ) {
      state.riskAssessments = action.payload.riskAssessments;
    },
    addRiskAssessment(
      state: RiskAssessmentState,
      action: PayloadAction<{ riskAssessment: RiskAssessment }>
    ) {
      // Newest first, matching the order the API lists them in.
      state.riskAssessments = [
        action.payload.riskAssessment,
        ...state.riskAssessments
      ];
    },
    editRiskAssessment(
      state: RiskAssessmentState,
      action: PayloadAction<{ riskAssessment: RiskAssessment }>
    ) {
      const { riskAssessment } = action.payload;
      state.riskAssessments = state.riskAssessments.map((item) =>
        item.id === riskAssessment.id ? riskAssessment : item
      );
    },
    deleteRiskAssessment(
      state: RiskAssessmentState,
      action: PayloadAction<{ id: number }>
    ) {
      state.riskAssessments = state.riskAssessments.filter(
        (item) => item.id !== action.payload.id
      );
    },
    setLoadingGet(
      state: RiskAssessmentState,
      action: PayloadAction<{ loading: boolean }>
    ) {
      state.loadingGet = action.payload.loading;
    }
  }
});

export const reducer = slice.reducer;

export const getRiskAssessments = (): AppThunk => async (dispatch) => {
  dispatch(slice.actions.setLoadingGet({ loading: true }));
  try {
    const riskAssessments = await api.get<RiskAssessment[]>(basePath);
    dispatch(slice.actions.getRiskAssessments({ riskAssessments }));
  } catch {
  } finally {
    dispatch(slice.actions.setLoadingGet({ loading: false }));
  }
};

export const addRiskAssessment =
  (riskAssessment: RiskAssessmentPayload): AppThunk =>
  async (dispatch) => {
    const response = await api.post<RiskAssessment>(basePath, riskAssessment);
    dispatch(slice.actions.addRiskAssessment({ riskAssessment: response }));
  };

export const editRiskAssessment =
  (id: number, riskAssessment: RiskAssessmentPayload): AppThunk =>
  async (dispatch) => {
    const response = await api.patch<RiskAssessment>(
      `${basePath}/${id}`,
      riskAssessment
    );
    dispatch(slice.actions.editRiskAssessment({ riskAssessment: response }));
  };

/**
 * Records the work order raised to carry out the assessment's action. The work order itself is
 * created through the usual endpoint first.
 */
export const attachWorkOrderToRiskAssessment =
  (id: number, workOrderId: number): AppThunk =>
  async (dispatch) => {
    const response = await api.patch<RiskAssessment>(
      `${basePath}/${id}/work-order/${workOrderId}`,
      {}
    );
    dispatch(slice.actions.editRiskAssessment({ riskAssessment: response }));
  };

export const deleteRiskAssessment =
  (id: number): AppThunk =>
  async (dispatch) => {
    await api.deletes<{ success: boolean }>(`${basePath}/${id}`);
    dispatch(slice.actions.deleteRiskAssessment({ id }));
  };
