import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { MainTabNavigator } from './MainTabNavigator';
import { RootStackParamList } from '../types/navigation';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import {
  checkSessionThunk,
  dismissSessionExpiredDialog,
  forceFinishSessionCheck,
} from '../redux/slices/authSlice';
import { loadStoredLanguageThunk } from '../redux/slices/languageSlice';
import { showFeedback } from '../redux/slices/feedbackSlice';
import { colors } from '../theme';
import { RigLogo } from '../components/common/RigLogo';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isCheckingSession, sessionExpiredDialog } =
    useAppSelector(state => state.auth);

  const appState = useRef(AppState.currentState);

  // Check session and load language at app startup with safety fallback timeout
  useEffect(() => {
    dispatch(checkSessionThunk());
    dispatch(loadStoredLanguageThunk());

    // Failsafe: splash screen must NEVER hang indefinitely under any native circumstance
    const timeout = setTimeout(() => {
      dispatch(forceFinishSessionCheck());
    }, 2500);

    return () => clearTimeout(timeout);
  }, [dispatch]);

  // Check session when app returns from background
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (
          appState.current &&
          appState.current.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          dispatch(checkSessionThunk());
        }
        appState.current = nextAppState;
      },
    );

    return () => {
      subscription.remove();
    };
  }, [dispatch]);

  // Listen for session expiry and show required application dialog
  useEffect(() => {
    if (sessionExpiredDialog) {
      dispatch(
        showFeedback({
          type: 'warning',
          title: 'Session Expired',
          message: 'Session expired. Please login again.',
          confirmText: 'OK',
          onConfirm: () => {
            dispatch(dismissSessionExpiredDialog());
          },
        }),
      );
    }
  }, [sessionExpiredDialog, dispatch]);

  if (isCheckingSession) {
    return (
      <View style={styles.splashContainer}>
        <RigLogo size={70} color={colors.primary} showText={true} />
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.spinner}
        />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: colors.surfacePaper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginTop: 20,
  },
});
