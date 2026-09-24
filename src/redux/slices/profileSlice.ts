import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ProfileEntity } from '../../types/database';
import { ProfileRepository } from '../../database/repositories/ProfileRepository';

interface ProfileState {
  profile: ProfileEntity | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  profile: null,
  isLoading: false,
  error: null,
};

export const fetchProfileThunk = createAsyncThunk('profile/fetch', async () => {
  return ProfileRepository.getProfile();
});

export const updateProfileThunk = createAsyncThunk(
  'profile/update',
  async (profile: ProfileEntity) => {
    return ProfileRepository.updateProfile(profile);
  },
);

export const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchProfileThunk.pending, state => {
      state.isLoading = true;
    });
    builder.addCase(fetchProfileThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.profile = action.payload;
    });
    builder.addCase(fetchProfileThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to load profile';
    });

    builder.addCase(updateProfileThunk.fulfilled, (state, action) => {
      state.profile = action.payload;
    });
  },
});

export default profileSlice.reducer;
