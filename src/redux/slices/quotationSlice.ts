import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { QuotationEntity, QuotationStatus } from '../../types/database';
import { QuotationRepository } from '../../database/repositories/QuotationRepository';

interface QuotationState {
  quotations: QuotationEntity[];
  selectedQuotation: QuotationEntity | null;
  searchQuery: string;
  statusFilter: 'all' | QuotationStatus;
  isLoading: boolean;
  error: string | null;
}

const initialState: QuotationState = {
  quotations: [],
  selectedQuotation: null,
  searchQuery: '',
  statusFilter: 'all',
  isLoading: false,
  error: null,
};

export const fetchQuotationsThunk = createAsyncThunk(
  'quotations/fetchAll',
  async () => {
    return QuotationRepository.getAllQuotations();
  },
);

export const updateQuotationStatusThunk = createAsyncThunk(
  'quotations/updateStatus',
  async ({ id, status }: { id: string; status: QuotationStatus }) => {
    const updated = await QuotationRepository.updateQuotationStatus(id, status);
    return updated;
  },
);

export const deleteQuotationThunk = createAsyncThunk(
  'quotations/delete',
  async (id: string) => {
    await QuotationRepository.deleteQuotation(id);
    return id;
  },
);

export const quotationSlice = createSlice({
  name: 'quotations',
  initialState,
  reducers: {
    setSelectedQuotation: (
      state,
      action: PayloadAction<QuotationEntity | null>,
    ) => {
      state.selectedQuotation = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setStatusFilter: (
      state,
      action: PayloadAction<'all' | QuotationStatus>,
    ) => {
      state.statusFilter = action.payload;
    },
    clearQuotationError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    // Fetch all
    builder.addCase(fetchQuotationsThunk.pending, state => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchQuotationsThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.quotations = action.payload;
      state.error = null;
    });
    builder.addCase(fetchQuotationsThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.error = (action.error.message as string) || 'Failed to fetch quotations';
    });

    // Update status
    builder.addCase(updateQuotationStatusThunk.fulfilled, (state, action) => {
      if (action.payload) {
        const idx = state.quotations.findIndex(q => q.id === action.payload!.id);
        if (idx !== -1) {
          state.quotations[idx] = action.payload;
        }
        if (state.selectedQuotation?.id === action.payload.id) {
          state.selectedQuotation = action.payload;
        }
      }
    });

    // Delete
    builder.addCase(deleteQuotationThunk.fulfilled, (state, action) => {
      state.quotations = state.quotations.filter(q => q.id !== action.payload);
      if (state.selectedQuotation?.id === action.payload) {
        state.selectedQuotation = null;
      }
    });
  },
});

export const {
  setSelectedQuotation,
  setSearchQuery,
  setStatusFilter,
  clearQuotationError,
} = quotationSlice.actions;

export const quotationReducer = quotationSlice.reducer;
