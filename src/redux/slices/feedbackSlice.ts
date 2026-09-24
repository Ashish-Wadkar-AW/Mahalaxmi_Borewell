import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FeedbackConfig, FeedbackType } from '../../components/feedback/AppFeedbackModal';

interface FeedbackState {
  config: FeedbackConfig;
}

const initialState: FeedbackState = {
  config: {
    visible: false,
    type: 'info',
    title: '',
    message: '',
  },
};

export const feedbackSlice = createSlice({
  name: 'feedback',
  initialState,
  reducers: {
    showFeedback: (
      state,
      action: PayloadAction<{
        type: FeedbackType;
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        dismissible?: boolean;
        onConfirm?: () => void;
        onCancel?: () => void;
      }>,
    ) => {
      state.config = {
        visible: true,
        ...action.payload,
      };
    },
    hideFeedback: state => {
      state.config.visible = false;
    },
  },
});

export const { showFeedback, hideFeedback } = feedbackSlice.actions;
export default feedbackSlice.reducer;
