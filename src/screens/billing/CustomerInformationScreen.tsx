import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { Button } from '../../components/common/Button';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  setCustomerName,
  setCustomerPhone,
  setCustomerAddress,
  setDate,
} from '../../redux/slices/billingSlice';
import { showFeedback } from '../../redux/slices/feedbackSlice';
import { BillingStepIndicator } from './components/BillingStepIndicator';
import { BillingStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<BillingStackParamList, 'CustomerInformation'>;

export const CustomerInformationScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationProp>();

  const billing = useAppSelector(state => state.billing);
  const isMarathi = useAppSelector(state => state.language.currentLanguage === 'mr');

  const [nameError, setNameError] = useState('');

  const handleNext = () => {
    setNameError('');
    if (!billing.customerName.trim()) {
      const errorMsg = isMarathi
        ? 'कृपया ग्राहकाचे नांव प्रविष्ट करा.'
        : 'Please enter customer name.';
      setNameError(errorMsg);
      dispatch(
        showFeedback({
          type: 'error',
          title: isMarathi ? 'माहिती आवश्यक' : 'Validation Error',
          message: isMarathi
            ? 'कृपया ग्राहकाचे पूर्ण नांव प्रविष्ट करा.'
            : 'Please enter customer full name.',
        }),
      );
      return;
    }

    navigation.navigate('BorewellInformation');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        {/* Step Indicator Header with Language Toggle & Reset */}
        <BillingStepIndicator currentStep={1} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.formCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>
                {isMarathi ? '१. ग्राहक माहिती' : '1. Customer Information'}
              </Text>
            </View>

            {/* Customer Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {isMarathi ? 'ग्राहकाचे पूर्ण नांव *' : 'Customer Full Name *'}
              </Text>
              <TextInput
                value={billing.customerName}
                onChangeText={text => {
                  dispatch(setCustomerName(text));
                  if (nameError) setNameError('');
                }}
                placeholder={isMarathi ? 'उदा. राहुल पाटील' : 'e.g. Rahul Patil'}
                placeholderTextColor={colors.gray400}
                style={[styles.textInput, !!nameError && styles.inputErrorBorder]}
              />
              {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
            </View>

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {isMarathi ? 'मोबाईल / फोन नंबर' : 'Phone Number'}
              </Text>
              <TextInput
                value={billing.customerPhone}
                onChangeText={text => dispatch(setCustomerPhone(text))}
                placeholder={isMarathi ? 'उदा. 9876543210' : 'e.g. 9876543210'}
                keyboardType="phone-pad"
                placeholderTextColor={colors.gray400}
                style={styles.textInput}
              />
            </View>

            {/* Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {isMarathi ? 'पत्ता व गाव' : 'Address / Village'}
              </Text>
              <TextInput
                value={billing.customerAddress}
                onChangeText={text => dispatch(setCustomerAddress(text))}
                placeholder={isMarathi ? 'उदा. हणबरवाडी, ता. करवीर' : 'e.g. Hanbarwadi, Kolhapur'}
                placeholderTextColor={colors.gray400}
                style={styles.textInput}
              />
            </View>

            {/* Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {isMarathi ? 'दिनांक' : 'Date'}
              </Text>
              <TextInput
                value={billing.date}
                onChangeText={text => dispatch(setDate(text))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.gray400}
                style={styles.textInput}
              />
            </View>
          </View>
        </ScrollView>

        {/* Bottom Navigation Bar */}
        <View style={styles.bottomBar}>
          <View style={{ flex: 1 }} />
          <Button
            title={isMarathi ? 'पुढे' : 'Next'}
            onPress={handleNext}
            icon="chevronRight"
            iconPosition="right"
            size="md"
            style={styles.nextBtn}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F4EC',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#7A1C1C',
  },
  inputGroup: {
    marginBottom: spacing.sm,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#FAF7F0',
    borderWidth: 1,
    borderColor: colors.borderMedium,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
  },
  inputErrorBorder: {
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 2,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    ...shadows.sm,
  },
  nextBtn: {
    minWidth: 130,
  },
});
