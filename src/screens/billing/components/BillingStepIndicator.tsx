import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { Icon } from '../../../components/common/Icon';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import {
  resetBillingForm,
  fetchNextBillNumberThunk,
} from '../../../redux/slices/billingSlice';
import { showFeedback } from '../../../redux/slices/feedbackSlice';

export interface BillingStepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4 | 5;
}

interface StepMeta {
  step: 1 | 2 | 3 | 4 | 5;
  labelMr: string;
  labelEn: string;
}

const STEPS: StepMeta[] = [
  { step: 1, labelMr: 'ग्राहक', labelEn: 'Customer' },
  { step: 2, labelMr: 'बोरवेल', labelEn: 'Borewell' },
  { step: 3, labelMr: 'साहित्य', labelEn: 'Materials' },
  { step: 4, labelMr: 'एकूण', labelEn: 'Total' },
  { step: 5, labelMr: 'पेमेंट', labelEn: 'Payment' },
];

export const BillingStepIndicator: React.FC<BillingStepIndicatorProps> = ({ currentStep }) => {
  const dispatch = useAppDispatch();
  const billing = useAppSelector(state => state.billing);
  const currentLanguage = useAppSelector(state => state.language.currentLanguage);
  const isMarathi = currentLanguage === 'mr';

  const handleReset = () => {
    dispatch(
      showFeedback({
        type: 'confirmation',
        title: isMarathi ? 'नवीन कोटेशन?' : 'New Quotation?',
        message: isMarathi
          ? 'सर्व माहिती रिकामी करून नवीन फॉर्म सुरू करायचा आहे का?'
          : 'Clear entered form data and start a new quotation?',
        confirmText: isMarathi ? 'होय, रीसेट करा' : 'Reset Form',
        onConfirm: () => {
          dispatch(resetBillingForm());
          dispatch(fetchNextBillNumberThunk());
        },
      }),
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Control Bar: Bill number badge, Reset button */}
      <View style={styles.controlBar}>
        <View style={styles.billBadge}>
          <Text style={styles.billBadgeText}>
            {isMarathi ? 'कोटेशन नं: ' : 'Quote #: '}
            {billing.billNumber || 'Q-001'}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleReset}
          style={styles.resetBtn}>
          <Icon name="refresh" size={14} color={colors.primary} />
          <Text style={styles.resetBtnText}>{isMarathi ? 'नवीन' : 'Reset'}</Text>
        </TouchableOpacity>
      </View>

      {/* Visual Step Indicator Progress Bar */}
      <View style={styles.stepsRow}>
        {STEPS.map((item, index) => {
          const isCompleted = item.step < currentStep;
          const isActive = item.step === currentStep;

          return (
            <React.Fragment key={item.step}>
              {/* Connector line before step node (except first node) */}
              {index > 0 && (
                <View
                  style={[
                    styles.connectorLine,
                    item.step <= currentStep && styles.connectorLineActive,
                  ]}
                />
              )}

              {/* Step Node */}
              <View style={styles.stepNodeContainer}>
                <View
                  style={[
                    styles.circle,
                    isCompleted && styles.circleCompleted,
                    isActive && styles.circleActive,
                  ]}>
                  {isCompleted ? (
                    <Icon name="check" size={12} color="#FFFFFF" strokeWidth={2.8} />
                  ) : (
                    <Text
                      style={[
                        styles.circleText,
                        isActive && styles.circleTextActive,
                      ]}>
                      {item.step}
                    </Text>
                  )}
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.stepLabel,
                    isActive && styles.stepLabelActive,
                    isCompleted && styles.stepLabelCompleted,
                  ]}>
                  {isMarathi ? item.labelMr : item.labelEn}
                </Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    ...shadows.sm,
  },
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs + 2,
    paddingBottom: spacing.xs,
  },
  billBadge: {
    backgroundColor: '#FAF7F0',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  billBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfacePaper,
    borderWidth: 1,
    borderColor: colors.borderMedium,
  },
  resetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  stepNodeContainer: {
    alignItems: 'center',
    width: 58,
  },
  connectorLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.borderLight,
    marginHorizontal: -4,
    marginBottom: 16,
  },
  connectorLineActive: {
    backgroundColor: colors.primary,
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfacePaper,
    borderWidth: 1.5,
    borderColor: colors.borderMedium,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  circleCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  circleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    transform: [{ scale: 1.15 }],
    ...shadows.sm,
  },
  circleText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  circleTextActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.gray500,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  stepLabelCompleted: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
