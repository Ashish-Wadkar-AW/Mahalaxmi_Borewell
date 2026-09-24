import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { RigLogo } from '../../components/common/RigLogo';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { loginThunk, registerThunk } from '../../redux/slices/authSlice';
import { showFeedback } from '../../redux/slices/feedbackSlice';
import { APP_VERSION } from '../../config/appConfig';

export const LoginScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector(state => state.auth);
  const currentLanguage = useAppSelector(
    state => (state as any).language?.currentLanguage || 'mr',
  );
  const isMarathi = currentLanguage === 'mr';

  const [mobileNumber, setMobileNumber] = useState('8379918585');
  const [password, setPassword] = useState('admin');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('Owner');
  const [submitting, setSubmitting] = useState(false);

  const [mobileError, setMobileError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validate = (): boolean => {
    let valid = true;
    setMobileError('');
    setPasswordError('');

    if (isRegisterMode && (!name || !name.trim())) {
      dispatch(
        showFeedback({
          type: 'error',
          title: isMarathi ? 'त्रुटी' : 'Validation Error',
          message: isMarathi ? 'कृपया तुमचे पूर्ण नाव प्रविष्ट करा.' : 'Please enter your full name.',
        }),
      );
      return false;
    }

    if (!mobileNumber.trim() || mobileNumber.trim().length < 10) {
      setMobileError(
        isMarathi
          ? 'कृपया वैध १०-अंकी मोबाईल नंबर प्रविष्ट करा.'
          : 'Please enter a valid 10-digit mobile number.',
      );
      valid = false;
    }

    if (!password.trim() || password.length < 4) {
      setPasswordError(
        isMarathi
          ? 'पासवर्ड किमान ४ अक्षरांचा असणे आवश्यक आहे.'
          : 'Password must be at least 4 characters.',
      );
      valid = false;
    }

    return valid;
  };

  const handleLogin = async () => {
    if (isLoading || submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (isRegisterMode) {
        const resultAction = await dispatch(
          registerThunk({
            name: name.trim(),
            mobileNumber: mobileNumber.trim(),
            password,
          }),
        );

        if (registerThunk.rejected.match(resultAction)) {
          const errMsg = (resultAction.payload as string) || 'Registration failed.';
          dispatch(
            showFeedback({
              type: 'error',
              title: 'Registration Failed',
              message: errMsg,
            }),
          );
        }
      } else {
        const resultAction = await dispatch(
          loginThunk({
            mobileNumber: mobileNumber.trim(),
            password,
          }),
        );

        if (loginThunk.rejected.match(resultAction)) {
          const errMsg =
            (resultAction.payload as string) ||
            'Invalid credentials. Default: 8379918585 / admin';
          dispatch(
            showFeedback({
              type: 'error',
              title: 'Authentication Failed',
              message: errMsg,
            }),
          );
        }
      }
    } catch (err: any) {
      dispatch(
        showFeedback({
          type: 'error',
          title: 'Error',
          message: err?.message || 'An unexpected error occurred.',
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {/* Sacred Verse */}
          <Text style={styles.sacredVerse}>|| श्री जोतिर्लिंग प्रसन्न ||</Text>

          {/* Logo & Header */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <RigLogo size={60} color={colors.primary} showText={true} />
            </View>
            <Text style={styles.companyTitle}>महालक्ष्मी बोरवेल</Text>
            <Text style={styles.companySubtitle}>
              इलेक्ट्रिकल्स ॲन्ड मेकॅनिकल्स
            </Text>
            <Text style={styles.locationText}>
              मु. पो. हणबरवाडी, ता. करवीर, जि. कोल्हापूर
            </Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {isRegisterMode
                ? isMarathi
                  ? 'नवीन खाते तयार करा'
                  : 'Create Account'
                : isMarathi
                  ? 'व्यवसाय लॉगिन'
                  : 'Business Login'}
            </Text>
            <Text style={styles.cardSubtitle}>
              {isRegisterMode
                ? isMarathi
                  ? 'खाते तयार करण्यासाठी तुमचे तपशील प्रविष्ट करा'
                  : 'Enter your details to create an account'
                : isMarathi
                  ? 'पुढे जाण्यासाठी तुमची माहिती प्रविष्ट करा'
                  : 'Enter your credentials to continue'}
            </Text>

            {isRegisterMode && (
              <Input
                label={isMarathi ? 'पूर्ण नाव' : 'Full Name'}
                placeholder={isMarathi ? 'पूर्ण नाव प्रविष्ट करा' : 'Enter full name'}
                value={name}
                onChangeText={setName}
                icon="user"
                required
              />
            )}

            <Input
              label={isMarathi ? 'मोबाईल नंबर' : 'Mobile Number'}
              placeholder={isMarathi ? 'उदा. 8379918585' : 'e.g. 8379918585'}
              value={mobileNumber}
              onChangeText={setMobileNumber}
              keyboardType="phone-pad"
              icon="phone"
              error={mobileError}
              required
            />

            <Input
              label={isMarathi ? 'पासवर्ड' : 'Password'}
              placeholder={isMarathi ? 'पासवर्ड प्रविष्ट करा' : 'Enter password'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              icon="lock"
              error={passwordError}
              hint={
                !isRegisterMode
                  ? isMarathi
                    ? 'डीफॉल्ट पासवर्ड: admin'
                    : 'Default password is: admin'
                  : undefined
              }
              required
            />

            <Button
              title={
                isLoading || submitting
                  ? isMarathi
                    ? 'पडताळणी करत आहे...'
                    : 'Verifying...'
                  : isRegisterMode
                    ? isMarathi
                      ? 'नोंदणी करा व पुढे जा'
                      : 'Register & Continue'
                    : isMarathi
                      ? 'लॉगिन करा'
                      : 'Login to Application'
              }
              onPress={handleLogin}
              loading={isLoading || submitting}
              disabled={isLoading || submitting}
              icon="lock"
              size="lg"
              style={styles.submitBtn}
            />

            <TouchableOpacity
              onPress={() => setIsRegisterMode(!isRegisterMode)}
              style={styles.toggleModeBtn}>
              <Text style={styles.toggleModeText}>
                {isRegisterMode
                  ? isMarathi
                    ? 'आधीच खाते आहे? लॉगिन करा'
                    : 'Already have an account? Login'
                  : isMarathi
                    ? 'नवीन वापरकर्ता? नवीन खाते तयार करा'
                    : 'First time user? Register new account'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* App Version Display */}
          <View style={styles.securityBanner}>
            <Text style={styles.securityText}>
              Version {APP_VERSION}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surfacePaper,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  sacredVerse: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
    letterSpacing: 0.5,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderMedium,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  companyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  companySubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  locationText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  submitBtn: {
    marginTop: spacing.md,
  },
  toggleModeBtn: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  toggleModeText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  securityBanner: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  securityText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '500',
  },
});
