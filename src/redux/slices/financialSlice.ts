import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { IncomeEntity, ExpenseEntity } from '../../types/database';
import { FinancialRepository } from '../../database/repositories/FinancialRepository';

interface FinancialState {
  incomes: IncomeEntity[];
  expenses: ExpenseEntity[];
  isLoading: boolean;
  error: string | null;
}

const initialState: FinancialState = {
  incomes: [],
  expenses: [],
  isLoading: false,
  error: null,
};

export const fetchFinancialsThunk = createAsyncThunk(
  'financials/fetchAll',
  async () => {
    const [incomes, expenses] = await Promise.all([
      FinancialRepository.getAllIncome(),
      FinancialRepository.getAllExpenses(),
    ]);
    return { incomes, expenses };
  },
);

export const addIncomeThunk = createAsyncThunk(
  'financials/addIncome',
  async (income: IncomeEntity) => {
    return FinancialRepository.addIncome(income);
  },
);

export const deleteIncomeThunk = createAsyncThunk(
  'financials/deleteIncome',
  async (id: string) => {
    await FinancialRepository.deleteIncome(id);
    return id;
  },
);

export const addExpenseThunk = createAsyncThunk(
  'financials/addExpense',
  async (expense: ExpenseEntity) => {
    return FinancialRepository.addExpense(expense);
  },
);

export const deleteExpenseThunk = createAsyncThunk(
  'financials/deleteExpense',
  async (id: string) => {
    await FinancialRepository.deleteExpense(id);
    return id;
  },
);

export const financialSlice = createSlice({
  name: 'financials',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchFinancialsThunk.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(fetchFinancialsThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.incomes = action.payload.incomes;
      state.expenses = action.payload.expenses;
    });
    builder.addCase(fetchFinancialsThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to fetch financial transactions';
    });

    builder.addCase(addIncomeThunk.fulfilled, (state, action) => {
      state.incomes.unshift(action.payload);
    });

    builder.addCase(deleteIncomeThunk.fulfilled, (state, action) => {
      state.incomes = state.incomes.filter(i => i.id !== action.payload);
    });

    builder.addCase(addExpenseThunk.fulfilled, (state, action) => {
      state.expenses.unshift(action.payload);
    });

    builder.addCase(deleteExpenseThunk.fulfilled, (state, action) => {
      state.expenses = state.expenses.filter(e => e.id !== action.payload);
    });
  },
});

export default financialSlice.reducer;
