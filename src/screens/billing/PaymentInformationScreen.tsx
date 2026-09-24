import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  setPaymentStatus,
  setPaidAmount,
  saveQuotationThunk,
  resetBillingForm,
  fetchNextBillNumberThunk,
} from '../../redux/slices/billingSlice';
import { showFeedback } from '../../redux/slices/feedbackSlice';
import { BillingStepIndicator } from './components/BillingStepIndicator';

export const PaymentInformationScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();

  const billing = useAppSelector(state => state.billing);
  const isMarathi = useAppSelector(state => state.language.currentLanguage === 'mr');
  const isSubmittingRef = useRef(false);

  const handleBack = () => {
    navigation.goBack();
  };

  const handlePaidAmountChange = (text: string) => {
    // Only allow numeric and decimal input
    const cleaned = text.replace(/[^0-9.]/g, '');
    dispatch(setPaidAmount(cleaned));

    const p = parseFloat(cleaned) || 0;
    console.log('[PAYMENT][CALCULATION]', {
      totalAmount: billing.grandTotal,
      paymentStatus: billing.paymentStatus,
      paidAmount: p,
      remainingAmount: Math.max(0, billing.grandTotal - p),
    });
  };

  const handleSaveQuotation = async () => {
    if (isSubmittingRef.current || billing.isSaving) return;
    isSubmittingRef.current = true;

    try {
      if (!billing.customerName.trim()) {
        dispatch(
          showFeedback({
            type: 'error',
            title: isMarathi ? 'माहिती आवश्यक' : 'Validation Error',
            message: isMarathi
              ? 'कृपया पायरी १ मध्ये ग्राहकाचे पूर्ण नांव प्रविष्ट करा.'
              : 'Please enter customer full name in Step 1.',
          }),
        );
        return;
      }

      if (billing.grandTotal <= 0) {
        dispatch(
          showFeedback({
            type: 'error',
            title: isMarathi ? 'किंमत आवश्यक' : 'Pricing Required',
            message: isMarathi
              ? 'कृपया किमान एका वस्तूचे वैध प्रमाण (Qty) व दर (Rate) प्रविष्ट करा.'
              : 'Please enter valid quantity and rate for at least one item.',
          }),
        );
        return;
      }

      const paidNum = parseFloat(billing.paidAmount) || 0;
      if (billing.paymentStatus === 'partial') {
        if (paidNum > billing.grandTotal) {
          dispatch(
            showFeedback({
              type: 'error',
              title: isMarathi ? 'अवैध रक्कम' : 'Invalid Amount',
              message: isMarathi
                ? 'जमा रक्कम एकूण रकमेपेक्षा जास्त असू शकत नाही.'
                : 'Paid amount cannot exceed grand total amount.',
            }),
          );
          return;
        }
        if (paidNum < 0) {
          dispatch(
            showFeedback({
              type: 'error',
              title: isMarathi ? 'अवैध रक्कम' : 'Invalid Amount',
              message: isMarathi
                ? 'जमा रक्कम ० पेक्षा कमी असू शकत नाही.'
                : 'Paid amount cannot be negative.',
            }),
          );
          return;
        }
      }

      const result = await dispatch(saveQuotationThunk());
      if (saveQuotationThunk.fulfilled.match(result)) {
        const savedQuotation = result.payload.quotation;
        const qId = savedQuotation.id;
        const qNum = savedQuotation.quotationNumber || savedQuotation.billNumber || 'Q-001';

        console.log('[QUOTATION][SAVE][SUCCESS]', {
          quotationId: qId,
          quotationNumber: qNum,
        });

        console.log('[QUOTATION][POPUP][OPEN]', {
          quotationId: qId,
          quotationNumber: qNum,
        });

        dispatch(
          showFeedback({
            type: 'success',
            title: isMarathi ? 'बिलिंग पूर्ण झाले' : 'Billing Completed',
            message: isMarathi
              ? 'बिलिंग यशस्वीरित्या जतन झाले आहे.'
              : 'Billing saved successfully.',
            confirmText: isMarathi ? 'कोटेशन तयार करा' : 'Generate Quotation',
            dismissible: false,
            onConfirm: () => {
              console.log('[QUOTATION][POPUP][GENERATE]', {
                quotationId: qId,
              });
              console.log('[QUOTATION][NAVIGATION][GENERATE]', {
                quotationId: qId,
              });
              navigation.navigate('QuotationTab', {
                screen: 'QuotationDetail',
                params: {
                  quotation: savedQuotation,
                  quotationId: qId,
                },
              });
            },
          }),
        );
        dispatch(resetBillingForm());
        dispatch(fetchNextBillNumberThunk());
      } else if (saveQuotationThunk.rejected.match(result)) {
        if ((result as any).meta?.condition) {
          return;
        }
        dispatch(
          showFeedback({
            type: 'error',
            title: isMarathi ? 'त्रुटी' : 'Error',
            message:
              (result.payload as string) ||
              (isMarathi ? 'कोटेशन जतन करता आले नाही.' : 'Unable to save quotation.'),
          }),
        );
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        {/* Step Indicator Header */}
        <BillingStepIndicator currentStep={5} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.formCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>
                {isMarathi ? '५. पेमेंट माहिती' : '5. Payment Information'}
              </Text>
            </View>

            {/* Payment Choice Segmented Options: Not Paid, Advance, Paid */}
            <Text style={styles.inputLabel}>
              {isMarathi ? 'पेमेंट स्थिती निवडा (Payment Status)' : 'Select Payment Status'}
            </Text>
            <View style={styles.paymentStatusRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => dispatch(setPaymentStatus('pending'))}
                style={[
                  styles.paymentStatusBtn,
                  billing.paymentStatus === 'pending' && styles.paymentBtnPendingActive,
                ]}>
                <Icon
                  name="clock"
                  size={14}
                  color={billing.paymentStatus === 'pending' ? '#FFFFFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.paymentBtnText,
                    billing.paymentStatus === 'pending' && styles.paymentBtnTextActive,
                  ]}>
                  {isMarathi ? 'देणे बाकी' : 'Not Paid'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => dispatch(setPaymentStatus('partial'))}
                style={[
                  styles.paymentStatusBtn,
                  billing.paymentStatus === 'partial' && styles.paymentBtnAdvanceActive,
                ]}>
                <Icon
                  name="rupee"
                  size={14}
                  color={billing.paymentStatus === 'partial' ? '#FFFFFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.paymentBtnText,
                    billing.paymentStatus === 'partial' && styles.paymentBtnTextActive,
                  ]}>
                  {isMarathi ? 'अ‍ॅडव्हान्स' : 'Advance'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => dispatch(setPaymentStatus('paid'))}
                style={[
                  styles.paymentStatusBtn,
                  billing.paymentStatus === 'paid' && styles.paymentBtnPaidActive,
                ]}>
                <Icon
                  name="check"
                  size={14}
                  color={billing.paymentStatus === 'paid' ? '#FFFFFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.paymentBtnText,
                    billing.paymentStatus === 'paid' && styles.paymentBtnTextActive,
                  ]}>
                  {isMarathi ? 'पूर्ण जमा' : 'Paid'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Advance Amount Input (Only when Advance is selected) */}
            {billing.paymentStatus === 'partial' ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {isMarathi ? 'अ‍ॅडव्हान्स / जमा रक्कम (₹) *' : 'Advance / Paid Amount (₹) *'}
                </Text>
                <TextInput
                  value={billing.paidAmount}
                  onChangeText={handlePaidAmountChange}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor={colors.gray400}
                  style={styles.textInput}
                />
              </View>
            ) : null}

            {/* Financial Status Summary Box */}
            <View style={styles.paymentSummaryBox}>
              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>
                  {isMarathi ? 'पेमेंट स्थिती :' : 'Payment Status :'}
                </Text>
                <Text
                  style={[
                    styles.paymentSummaryStatusBadge,
                    billing.paymentStatus === 'paid'
                      ? styles.statusColorPaid
                      : billing.paymentStatus === 'partial'
                        ? styles.statusColorAdvance
                        : styles.statusColorPending,
                  ]}>
                  {billing.paymentStatus === 'paid'
                    ? isMarathi ? 'पूर्ण जमा' : 'Paid'
                    : billing.paymentStatus === 'partial'
                      ? isMarathi ? 'अ‍ॅडव्हान्स' : 'Advance'
                      : isMarathi ? 'देणे बाकी' : 'Not Paid'}
                </Text>
              </View>

              <View style={styles.paymentSummaryDivider} />

              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>
                  {isMarathi ? 'एकूण रक्कम (Grand Total) :' : 'Grand Total :'}
                </Text>
                <Text style={styles.paymentSummaryTotalVal}>
                  ₹ {billing.grandTotal.toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>
                  {isMarathi ? 'जमा रक्कम (Paid Amount) :' : 'Paid Amount :'}
                </Text>
                <Text style={styles.paymentSummaryPaidVal}>
                  ₹ {(billing.paymentStatus === 'paid'
                    ? billing.grandTotal
                    : billing.paymentStatus === 'pending'
                      ? 0
                      : parseFloat(billing.paidAmount) || 0
                  ).toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>
                  {isMarathi ? 'उर्वरित बाकी रक्कम (Remaining) :' : 'Remaining Amount :'}
                </Text>
                <Text
                  style={[
                    styles.paymentSummaryRemainingVal,
                    (billing.paymentStatus === 'paid'
                      ? 0
                      : billing.paymentStatus === 'pending'
                        ? billing.grandTotal
                        : billing.remainingAmount
                    ) > 0 && styles.remainingAlertColor,
                  ]}>
                  ₹ {(billing.paymentStatus === 'paid'
                    ? 0
                    : billing.paymentStatus === 'pending'
                      ? billing.grandTotal
                      : billing.remainingAmount
                  ).toLocaleString('en-IN')}
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
            title={
              billing.isSaving
                ? isMarathi ? 'जतन करत आहे...' : 'Saving...'
                : isMarathi ? 'कोटेशन तयार करा / जतन करा' : 'Generate / Save Quotation'
            }
            onPress={handleSaveQuotation}
            loading={billing.isSaving}
            disabled={billing.isSaving}
            icon="check"
            iconPosition="right"
            size="md"
            style={styles.saveSubmitBtn}
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
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
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
  paymentStatusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  paymentStatusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    borderColor: colors.borderMedium,
    backgroundColor: '#FFFFFF',
  },
  paymentBtnPendingActive: {
    backgroundColor: '#C53030',
    borderColor: '#C53030',
  },
  paymentBtnPaidActive: {
    backgroundColor: '#276749',
    borderColor: '#276749',
  },
  paymentBtnAdvanceActive: {
    backgroundColor: '#D69E2E',
    borderColor: '#D69E2E',
  },
  paymentBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  paymentBtnTextActive: {
    color: '#FFFFFF',
  },
  paymentSummaryBox: {
    backgroundColor: '#FAF7F0',
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    marginTop: spacing.xs,
  },
  paymentSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 3,
  },
  paymentSummaryDivider: {
    height: 1,
    backgroundColor: colors.borderMedium,
    marginVertical: spacing.xs,
  },
  paymentSummaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  paymentSummaryStatusBadge: {
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  statusColorPaid: {
    backgroundColor: '#C6F6D5',
    color: '#22543D',
  },
  statusColorAdvance: {
    backgroundColor: '#FEFCBF',
    color: '#744210',
  },
  statusColorPending: {
    backgroundColor: '#FED7D7',
    color: '#742A2A',
  },
  paymentSummaryTotalVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  paymentSummaryPaidVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#276749',
  },
  paymentSummaryRemainingVal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  remainingAlertColor: {
    color: '#C53030',
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
    minWidth: 100,
  },
  saveSubmitBtn: {
    flex: 1,
    marginLeft: spacing.md,
    backgroundColor: '#7A1C1C',
  },
});
