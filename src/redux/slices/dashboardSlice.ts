import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { InvoiceRepository } from '../../database/repositories/InvoiceRepository';
import { FinancialRepository } from '../../database/repositories/FinancialRepository';
import { ReminderRepository } from '../../database/repositories/ReminderRepository';
import { ReminderEntity } from '../../types/database';

export type DashboardFilter = '15_days' | '1_month' | '3_months' | '6_months';

export interface ChartDataPoint {
  label: string;
  revenue: number;
  income: number;
  expense: number;
}

interface DashboardState {
  filter: DashboardFilter;
  revenue: number;
  income: number;
  expenses: number;
  netBalance: number;
  chartData: ChartDataPoint[];
  upcomingReminders: ReminderEntity[];
  isLoading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  filter: '1_month',
  revenue: 0,
  income: 0,
  expenses: 0,
  netBalance: 0,
  chartData: [],
  upcomingReminders: [],
  isLoading: false,
  error: null,
};

const getFilterDays = (filter: DashboardFilter): number => {
  switch (filter) {
    case '15_days':
      return 15;
    case '1_month':
      return 30;
    case '3_months':
      return 90;
    case '6_months':
      return 180;
  }
};

export const fetchDashboardMetricsThunk = createAsyncThunk(
  'dashboard/fetchMetrics',
  async (filter: DashboardFilter) => {
    const [invoices, incomes, expenses, reminders] = await Promise.all([
      InvoiceRepository.getAllInvoices(),
      FinancialRepository.getAllIncome(),
      FinancialRepository.getAllExpenses(),
      ReminderRepository.getAllReminders(),
    ]);

    const days = getFilterDays(filter);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffTime = cutoffDate.getTime();

    // Filter within selected time window
    const filteredInvoices = invoices.filter(
      inv => new Date(inv.date).getTime() >= cutoffTime,
    );
    const filteredIncomes = incomes.filter(
      inc => new Date(inc.date).getTime() >= cutoffTime,
    );
    const filteredExpenses = expenses.filter(
      exp => new Date(exp.date).getTime() >= cutoffTime,
    );

    // Dynamic calculations from SQLite records
    const totalRevenue = filteredInvoices.reduce(
      (sum, inv) => sum + (inv.grandTotal || 0),
      0,
    );
    const totalIncome = filteredIncomes.reduce(
      (sum, inc) => sum + (inc.amount || 0),
      0,
    );
    const totalExpenses = filteredExpenses.reduce(
      (sum, exp) => sum + (exp.amount || 0),
      0,
    );
    const netBalance = Math.round((totalRevenue + totalIncome - totalExpenses) * 100) / 100;

    // Build timeline chart points (split into 4-6 equal interval buckets)
    const numBuckets = filter === '15_days' ? 5 : filter === '1_month' ? 4 : 6;
    const bucketDays = Math.ceil(days / numBuckets);
    const chartData: ChartDataPoint[] = [];

    for (let i = numBuckets - 1; i >= 0; i--) {
      const bStart = new Date();
      bStart.setDate(bStart.getDate() - (i + 1) * bucketDays);
      const bEnd = new Date();
      bEnd.setDate(bEnd.getDate() - i * bucketDays);

      const label = `${bEnd.getDate()}/${bEnd.getMonth() + 1}`;

      const bRev = filteredInvoices
        .filter(
          inv =>
            new Date(inv.date).getTime() >= bStart.getTime() &&
            new Date(inv.date).getTime() <= bEnd.getTime(),
        )
        .reduce((sum, inv) => sum + inv.grandTotal, 0);

      const bInc = filteredIncomes
        .filter(
          inc =>
            new Date(inc.date).getTime() >= bStart.getTime() &&
            new Date(inc.date).getTime() <= bEnd.getTime(),
        )
        .reduce((sum, inc) => sum + inc.amount, 0);

      const bExp = filteredExpenses
        .filter(
          exp =>
            new Date(exp.date).getTime() >= bStart.getTime() &&
            new Date(exp.date).getTime() <= bEnd.getTime(),
        )
        .reduce((sum, exp) => sum + exp.amount, 0);

      chartData.push({
        label,
        revenue: Math.round(bRev),
        income: Math.round(bInc),
        expense: Math.round(bExp),
      });
    }

    // Upcoming pending reminders (top 4)
    const upcoming = reminders
      .filter(r => r.status === 'pending')
      .slice(0, 4);

    return {
      revenue: Math.round(totalRevenue * 100) / 100,
      income: Math.round(totalIncome * 100) / 100,
      expenses: Math.round(totalExpenses * 100) / 100,
      netBalance,
      chartData,
      upcomingReminders: upcoming,
    };
  },
);

export const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setDashboardFilter: (state, action: PayloadAction<DashboardFilter>) => {
      state.filter = action.payload;
    },
  },
  extraReducers: builder => {
    builder.addCase(fetchDashboardMetricsThunk.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(fetchDashboardMetricsThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.revenue = action.payload.revenue;
      state.income = action.payload.income;
      state.expenses = action.payload.expenses;
      state.netBalance = action.payload.netBalance;
      state.chartData = action.payload.chartData;
      state.upcomingReminders = action.payload.upcomingReminders;
      state.error = null;
    });
    builder.addCase(fetchDashboardMetricsThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to compute dashboard metrics';
    });
  },
});

export const { setDashboardFilter } = dashboardSlice.actions;
export default dashboardSlice.reducer;
