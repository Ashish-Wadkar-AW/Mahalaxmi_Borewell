import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './src/redux/store';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AppFeedbackModal } from './src/components/feedback/AppFeedbackModal';
import { useAppDispatch, useAppSelector } from './src/redux/hooks';
import { hideFeedback } from './src/redux/slices/feedbackSlice';
import { colors } from './src/theme';

function AppWithFeedback() {
  const dispatch = useAppDispatch();
  const { config } = useAppSelector(state => state.feedback);

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="dark-content" />
      <RootNavigator />
      <AppFeedbackModal
        config={config}
        onClose={() => dispatch(hideFeedback())}
      />
    </View>
  );
}

function App(): React.JSX.Element {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <AppWithFeedback />
      </SafeAreaProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: colors.surfacePaper,
  },
});

export default App;
