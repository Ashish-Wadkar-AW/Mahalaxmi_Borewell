import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { InvoiceEntity } from '../../types/database';
import { InvoiceRepository } from '../../database/repositories/InvoiceRepository';

interface InvoiceState {
  invoices: InvoiceEntity[];
  selectedInvoice: InvoiceEntity | null;
  searchQuery: string;
  statusFilter: 'all' | 'pending' | 'paid' | 'partial';
  isLoading: boolean;
  error: string | null;
}

const initialState: InvoiceState = {
  invoices: [],
  selectedInvoice: null,
  searchQuery: '',
  statusFilter: 'all',
  isLoading: false,
  error: null,
};

export const fetchInvoicesThunk = createAsyncThunk('invoices/fetchAll', async () => {
  return InvoiceRepository.getAllInvoices();
});

export const updateInvoicePaymentStatusThunk = createAsyncThunk(
  'invoices/updatePaymentStatus',
  async ({
    id,
    paymentStatus,
    paidAmount,
    remainingAmount,
  }: {
    id: string;
    paymentStatus: 'pending' | 'paid' | 'partial';
    paidAmount?: number;
    remainingAmount?: number;
  }) => {
    const updated = await InvoiceRepository.updatePaymentStatus(
      id,
      paymentStatus,
      paidAmount,
      remainingAmount,
    );
    return updated;
  },
);

export const invoiceSlice = createSlice({
  name: 'invoices',
  initialState,
  reducers: {
    setSelectedInvoice: (state, action: PayloadAction<InvoiceEntity | null>) => {
      state.selectedInvoice = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setStatusFilter: (
      state,
      action: PayloadAction<'all' | 'pending' | 'paid' | 'partial'>,
    ) => {
      state.statusFilter = action.payload;
    },
  },
  extraReducers: builder => {
    builder.addCase(fetchInvoicesThunk.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(fetchInvoicesThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.invoices = action.payload;
      state.error = null;
    });
    builder.addCase(fetchInvoicesThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to load invoices';
    });

    builder.addCase(updateInvoicePaymentStatusThunk.fulfilled, (state, action) => {
      if (action.payload) {
        const index = state.invoices.findIndex(i => i.id === action.payload!.id);
        if (index >= 0) {
          state.invoices[index] = action.payload;
        }
        if (state.selectedInvoice && state.selectedInvoice.id === action.payload.id) {
          state.selectedInvoice = action.payload;
        }
      }
    });
  },
});

export const { setSelectedInvoice, setSearchQuery, setStatusFilter } =
  invoiceSlice.actions;
export default invoiceSlice.reducer;
