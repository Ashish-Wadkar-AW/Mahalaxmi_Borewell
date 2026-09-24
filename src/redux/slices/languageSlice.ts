import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppLanguage = 'mr' | 'en';

const LANGUAGE_STORAGE_KEY = '@mahalaxmi_global_app_language';

export const loadStoredLanguageThunk = createAsyncThunk<AppLanguage>(
  'language/loadStoredLanguage',
  async () => {
    try {
      const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored === 'mr' || stored === 'en') {
        return stored;
      }
    } catch {}
    return 'mr';
  },
);

export const setLanguageThunk = createAsyncThunk<AppLanguage, AppLanguage>(
  'language/setLanguageThunk',
  async (language: AppLanguage) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {}
    return language;
  },
);

interface LanguageState {
  currentLanguage: AppLanguage;
  isLoading: boolean;
}

const initialState: LanguageState = {
  currentLanguage: 'mr',
  isLoading: false,
};

export const languageSlice = createSlice({
  name: 'language',
  initialState,
  reducers: {
    setLanguage: (state, action: PayloadAction<AppLanguage>) => {
      state.currentLanguage = action.payload;
      // Fire-and-forget async persistence
      AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, action.payload).catch(() => {});
    },
  },
  extraReducers: builder => {
    builder.addCase(loadStoredLanguageThunk.fulfilled, (state, action) => {
      state.currentLanguage = action.payload;
      state.isLoading = false;
    });
    builder.addCase(setLanguageThunk.fulfilled, (state, action) => {
      state.currentLanguage = action.payload;
    });
  },
});

export const { setLanguage } = languageSlice.actions;
export default languageSlice.reducer;
