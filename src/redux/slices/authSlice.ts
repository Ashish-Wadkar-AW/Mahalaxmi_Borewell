import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthService } from '../../services/AuthService';
import { UserEntity } from '../../types/database';
import { SessionMetadata } from '../../services/SecureStorageService';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isCheckingSession: boolean;
  user: UserEntity | null;
  session: SessionMetadata | null;
  sessionExpiredDialog: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: false,
  isCheckingSession: true,
  user: null,
  session: null,
  sessionExpiredDialog: false,
  error: null,
};

export const checkSessionThunk = createAsyncThunk(
  'auth/checkSession',
  async () => {
    try {
      const result = await AuthService.validateSession();
      return result;
    } catch (e: any) {
      console.warn('Session check error caught safely:', e);
      return { isValid: false, isExpired: false };
    }
  },
);

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (
    { mobileNumber, password }: { mobileNumber: string; password: string },
    { rejectWithValue },
  ) => {
    try {
      const result = await AuthService.login(mobileNumber, password);
      if (!result.success) {
        return rejectWithValue(result.error || 'Login failed');
      }
      return result;
    } catch (e: any) {
      return rejectWithValue(e.message || 'Login error');
    }
  },
);

export const registerThunk = createAsyncThunk(
  'auth/register',
  async (
    { name, mobileNumber, password }: { name: string; mobileNumber: string; password: string },
    { rejectWithValue },
  ) => {
    try {
      const result = await AuthService.register(name, mobileNumber, password);
      if (!result.success) {
        return rejectWithValue(result.error || 'Registration failed');
      }
      return result;
    } catch (e: any) {
      return rejectWithValue(e.message || 'Registration error');
    }
  },
);

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  await AuthService.logout();
  return true;
});

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    dismissSessionExpiredDialog: state => {
      state.sessionExpiredDialog = false;
    },
    clearAuthError: state => {
      state.error = null;
    },
    forceFinishSessionCheck: state => {
      state.isCheckingSession = false;
    },
  },
  extraReducers: builder => {
    // Check Session
    builder.addCase(checkSessionThunk.pending, state => {
      state.isCheckingSession = true;
    });
    builder.addCase(checkSessionThunk.fulfilled, (state, action) => {
      state.isCheckingSession = false;
      if (action.payload.isValid && action.payload.session) {
        state.isAuthenticated = true;
        state.session = action.payload.session;
      } else {
        state.isAuthenticated = false;
        state.session = null;
        if (action.payload.isExpired) {
          state.sessionExpiredDialog = true;
        }
      }
    });
    builder.addCase(checkSessionThunk.rejected, state => {
      state.isCheckingSession = false;
      state.isAuthenticated = false;
      state.session = null;
    });

    // Login
    builder.addCase(loginThunk.pending, state => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(loginThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user || null;
      state.session = action.payload.session || null;
      state.error = null;
    });
    builder.addCase(loginThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.error = (action.payload as string) || 'Authentication failed';
    });

    // Register
    builder.addCase(registerThunk.pending, state => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(registerThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user || null;
      state.session = action.payload.session || null;
      state.error = null;
    });
    builder.addCase(registerThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.error = (action.payload as string) || 'Registration failed';
    });

    // Logout
    builder.addCase(logoutThunk.fulfilled, state => {
      state.isAuthenticated = false;
      state.user = null;
      state.session = null;
      state.error = null;
    });
  },
});

export const {
  dismissSessionExpiredDialog,
  clearAuthError,
  forceFinishSessionCheck,
} = authSlice.actions;
export default authSlice.reducer;
