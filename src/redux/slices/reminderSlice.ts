import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ReminderEntity } from '../../types/database';
import { ReminderRepository } from '../../database/repositories/ReminderRepository';

interface ReminderState {
  reminders: ReminderEntity[];
  filter: 'all' | 'pending' | 'completed';
  isLoading: boolean;
  error: string | null;
}

const initialState: ReminderState = {
  reminders: [],
  filter: 'pending',
  isLoading: false,
  error: null,
};

export const fetchRemindersThunk = createAsyncThunk(
  'reminders/fetchAll',
  async () => {
    return ReminderRepository.getAllReminders();
  },
);

export const addReminderThunk = createAsyncThunk(
  'reminders/add',
  async (reminder: ReminderEntity) => {
    return ReminderRepository.addReminder(reminder);
  },
);

export const toggleReminderStatusThunk = createAsyncThunk(
  'reminders/toggleStatus',
  async (id: string) => {
    return ReminderRepository.toggleStatus(id);
  },
);

export const deleteReminderThunk = createAsyncThunk(
  'reminders/delete',
  async (id: string) => {
    await ReminderRepository.deleteReminder(id);
    return id;
  },
);

export const reminderSlice = createSlice({
  name: 'reminders',
  initialState,
  reducers: {
    setReminderFilter: (
      state,
      action: PayloadAction<'all' | 'pending' | 'completed'>,
    ) => {
      state.filter = action.payload;
    },
  },
  extraReducers: builder => {
    builder.addCase(fetchRemindersThunk.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(fetchRemindersThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.reminders = action.payload;
    });
    builder.addCase(fetchRemindersThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to fetch reminders';
    });

    builder.addCase(addReminderThunk.fulfilled, (state, action) => {
      state.reminders.unshift(action.payload);
    });

    builder.addCase(toggleReminderStatusThunk.fulfilled, (state, action) => {
      if (action.payload) {
        const index = state.reminders.findIndex(r => r.id === action.payload!.id);
        if (index >= 0) {
          state.reminders[index] = action.payload;
        }
      }
    });

    builder.addCase(deleteReminderThunk.fulfilled, (state, action) => {
      state.reminders = state.reminders.filter(r => r.id !== action.payload);
    });
  },
});

export const { setReminderFilter } = reminderSlice.actions;
export default reminderSlice.reducer;
