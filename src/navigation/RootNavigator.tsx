import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SplashScreen } from '../screens/splash/SplashScreen';
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

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isCheckingSession, sessionExpiredDialog } =
    useAppSelector(state => state.auth);

  const [minSplashDone, setMinSplashDone] = useState(false);
  const [initialLaunchDone, setInitialLaunchDone] = useState(false);
  const appState = useRef(AppState.currentState);

  // Check session and load language at app startup with 4-second opening splash duration
  useEffect(() => {
    dispatch(checkSessionThunk());
    dispatch(loadStoredLanguageThunk());

    // 4-second timer for the opening splash screen
    const splashTimer = setTimeout(() => {
      setMinSplashDone(true);
    }, 4000);

    // Failsafe: session check must NEVER hang indefinitely under any native circumstance
    const failsafeTimeout = setTimeout(() => {
      dispatch(forceFinishSessionCheck());
    }, 5000);

    return () => {
      clearTimeout(splashTimer);
      clearTimeout(failsafeTimeout);
    };
  }, [dispatch]);

  // Transition from opening splash screen once both 4 seconds have passed and session check is ready
  useEffect(() => {
    if (minSplashDone && !isCheckingSession && !initialLaunchDone) {
      setInitialLaunchDone(true);
    }
  }, [minSplashDone, isCheckingSession, initialLaunchDone]);

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

  if (!initialLaunchDone) {
    return <SplashScreen />;
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
