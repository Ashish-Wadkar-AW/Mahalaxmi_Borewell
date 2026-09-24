import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { RigLogo } from '../../components/common/RigLogo';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  fetchProfileThunk,
  updateProfileThunk,
} from '../../redux/slices/profileSlice';
import { showFeedback } from '../../redux/slices/feedbackSlice';
import { useNavigation } from '@react-navigation/native';

export const ProfileScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();

  const { profile, isLoading } = useAppSelector(state => state.profile);
  const currentLanguage = useAppSelector(state => state.language.currentLanguage);
  const isMarathi = currentLanguage === 'mr';

  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');

  useEffect(() => {
    dispatch(fetchProfileThunk());
  }, [dispatch]);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setMobileNumber(profile.mobileNumber || '');
      setEmail(profile.email || '');
      setBusinessName(profile.businessName || '');
      setBusinessAddress(profile.businessAddress || '');
      setGstNumber(profile.gstNumber || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!name.trim() || !businessName.trim()) {
      dispatch(
        showFeedback({
          type: 'warning',
          title: isMarathi ? 'माहिती आवश्यक' : 'Missing Required Fields',
          message: isMarathi
            ? 'कृपया तुमचे नांव आणि व्यवसायाचे नांव प्रविष्ट करा.'
            : 'Please provide both your name and business name.',
        }),
      );
      return;
    }

    await dispatch(
      updateProfileThunk({
        id: profile ? profile.id : 'default_profile',
        name: name.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email.trim(),
        businessName: businessName.trim(),
        businessAddress: businessAddress.trim(),
        gstNumber: gstNumber.trim(),
        updatedAt: new Date().toISOString(),
      }),
    );

    dispatch(
      showFeedback({
        type: 'success',
        title: isMarathi ? 'प्रोफाइल अपडेट झाली' : 'Profile Updated',
        message: isMarathi
          ? 'तुमचे व्यवसाय प्रोफाइल तपशील यशस्वीरित्या जतन झाले.'
          : 'Your business profile details have been saved locally.',
      }),
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isMarathi ? 'व्यवसाय प्रोफाइल' : 'Business Profile'}
        subtitle={isMarathi ? 'कोटेशन व इनव्हॉइस ओळख' : 'Quotation & invoice identity'}
        showBack
        onBackPress={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Brand Identity Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <RigLogo size={52} color={colors.primary} showText={true} />
            </View>
            <Text style={styles.avatarTitle}>
              {businessName || 'Mahalaxmi Borewell'}
            </Text>
            <Text style={styles.avatarSubtitle}>
              {businessAddress || 'Kolhapur, Maharashtra'}
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formCard}>
            <Input
              label={isMarathi ? 'मालक / संपर्क व्यक्ती' : 'Owner / Contact Person'}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Ashish"
              icon="user"
              required
            />

            <Input
              label={isMarathi ? 'व्यवसायाचे नांव' : 'Business Name'}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Mahalaxmi Borewell Electricals & Mechanicals"
              icon="building"
              required
            />

            <Input
              label={isMarathi ? 'प्राथमिक मोबाईल नंबर' : 'Primary Mobile Number'}
              value={mobileNumber}
              onChangeText={setMobileNumber}
              placeholder="8379918585"
              keyboardType="phone-pad"
              icon="phone"
            />

            <Input
              label={isMarathi ? 'ईमेल पत्ता' : 'Email Address'}
              value={email}
              onChangeText={setEmail}
              placeholder="mahalaxmiborewells@gmail.com"
              keyboardType="email-address"
              icon="mail"
            />

            <Input
              label={isMarathi ? 'व्यवसाय पत्ता' : 'Business Address'}
              value={businessAddress}
              onChangeText={setBusinessAddress}
              placeholder="At Post Hanbarwadi, Taluka Karveer, District Kolhapur"
              icon="location"
              multiline
              numberOfLines={2}
            />

            <Input
              label={isMarathi ? 'जीएसटी नंबर (ऐच्छिक)' : 'GST Number (Optional)'}
              value={gstNumber}
              onChangeText={setGstNumber}
              placeholder="27AAAAA0000A1Z5"
              icon="fileText"
            />

            <Button
              title={isMarathi ? 'प्रोफाइल जतन करा' : 'Save Profile Changes'}
              onPress={handleSave}
              loading={isLoading}
              icon="save"
              size="lg"
              style={styles.saveBtn}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderMedium,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  avatarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
  },
  avatarSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  saveBtn: {
    marginTop: spacing.md,
  },
});
