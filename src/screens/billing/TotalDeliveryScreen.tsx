import React from 'react';
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
  setDeliveryDays,
  setAmountInWords,
} from '../../redux/slices/billingSlice';
import { CalculationService } from '../../services/CalculationService';
import { BillingStepIndicator } from './components/BillingStepIndicator';
import { BillingStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<BillingStackParamList, 'TotalDelivery'>;

export const TotalDeliveryScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationProp>();

  const billing = useAppSelector(state => state.billing);
  const isMarathi = useAppSelector(state => state.language.currentLanguage === 'mr');

  const handleNext = () => {
    navigation.navigate('PaymentInformation');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        {/* Step Indicator Header */}
        <BillingStepIndicator currentStep={4} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.formCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>
                {isMarathi ? '४. एकूण रक्कम व डिलिव्हरी' : '4. Total & Delivery'}
              </Text>
            </View>

            {/* Grand Total Display (Strictly Read-Only, Automatically Calculated) */}
            <View style={styles.grandTotalHighlightBox}>
              <Text style={styles.grandTotalHighlightLabel}>
                {isMarathi ? 'एकूण रक्कम (Grand Total) :' : 'Grand Total Amount :'}
              </Text>
              <Text style={styles.grandTotalHighlightValue}>
                {CalculationService.formatIndianCurrency(billing.grandTotal)}
              </Text>
            </View>

            {/* Amount in Words */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {isMarathi ? 'अक्षरी रुपये (Amount in Words)' : 'Amount in Words (Rupees)'}
              </Text>
              <TextInput
                value={billing.amountInWords}
                onChangeText={text => dispatch(setAmountInWords(text))}
                placeholder={
                  isMarathi ? 'उदा. पंचवीस हजार रुपये फक्त' : 'e.g. Twenty Five Thousand Rupees Only'
                }
                placeholderTextColor={colors.gray400}
                style={[styles.textInput, styles.multilineInput]}
                multiline
              />
            </View>

            {/* Delivery Days */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {isMarathi ? 'मालाची डिलिव्हरी दिवस' : 'Delivery Days'}
              </Text>
              <View style={styles.rowAlign}>
                <TextInput
                  value={billing.deliveryDays}
                  onChangeText={text => dispatch(setDeliveryDays(text))}
                  placeholder="7"
                  keyboardType="numeric"
                  placeholderTextColor={colors.gray400}
                  style={[styles.textInput, styles.shortNumericInput]}
                />
                <Text style={styles.daysUnitText}>
                  {isMarathi ? 'दिवसात मिळेल (Days)' : 'Days'}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Navigation Bar */}
        <View style={styles.bottomBar}>
          <Button
            title={isMarathi ? 'मागे' : 'Back'}
            onPress={handleBack}
            variant="outline"
            icon="arrowLeft"
            iconPosition="left"
            size="md"
            style={styles.navBtn}
          />
          <Button
            title={isMarathi ? 'पुढे' : 'Next'}
            onPress={handleNext}
            icon="chevronRight"
            iconPosition="right"
            size="md"
            style={styles.navBtn}
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
  grandTotalHighlightBox: {
    backgroundColor: '#FAF7F0',
    borderWidth: 1.5,
    borderColor: '#7A1C1C',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  grandTotalHighlightLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7A1C1C',
    textTransform: 'uppercase',
  },
  grandTotalHighlightValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#7A1C1C',
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: spacing.md,
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
  multilineInput: {
    minHeight: 50,
    textAlignVertical: 'top',
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shortNumericInput: {
    width: 80,
    textAlign: 'center',
  },
  daysUnitText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
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
  navBtn: {
    minWidth: 120,
  },
});
