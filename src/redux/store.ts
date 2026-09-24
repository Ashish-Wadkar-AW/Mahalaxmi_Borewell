import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import languageReducer from './slices/languageSlice';
import billingReducer from './slices/billingSlice';
import invoiceReducer from './slices/invoiceSlice';
import financialReducer from './slices/financialSlice';
import reminderReducer from './slices/reminderSlice';
import dashboardReducer from './slices/dashboardSlice';
import profileReducer from './slices/profileSlice';
import feedbackReducer from './slices/feedbackSlice';
import { quotationReducer } from './slices/quotationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    language: languageReducer,
    billing: billingReducer,
    quotations: quotationReducer,
    invoices: invoiceReducer,
    financials: financialReducer,
    reminders: reminderReducer,
    dashboard: dashboardReducer,
    profile: profileReducer,
    feedback: feedbackReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false, // For flexible state handling
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
