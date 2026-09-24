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
  setBorewellDepth,
  setWaterBearing,
  setBoreSize,
} from '../../redux/slices/billingSlice';
import { BillingStepIndicator } from './components/BillingStepIndicator';
import { BillingStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<BillingStackParamList, 'BorewellInformation'>;

export const BorewellInformationScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationProp>();

  const billing = useAppSelector(state => state.billing);
  const isMarathi = useAppSelector(state => state.language.currentLanguage === 'mr');

  const handleNext = () => {
    navigation.navigate('MaterialDetails');
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
        <BillingStepIndicator currentStep={2} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.formCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>
                {isMarathi ? '२. बोरवेल माहिती' : '2. Borewell Information'}
              </Text>
            </View>

            {/* Borewell Depth */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {isMarathi ? 'बोरवेल खोली' : 'Borewell Depth'}
              </Text>
              <View style={styles.inputWithUnitRow}>
                <TextInput
                  value={billing.borewellDepth}
                  onChangeText={text => dispatch(setBorewellDepth(text))}
                  placeholder="500"
                  keyboardType="numeric"
                  placeholderTextColor={colors.gray400}
                  style={[styles.textInput, styles.flexInput]}
                />
                <View style={styles.unitBadge}>
                  <Text style={styles.unitBadgeText}>
                    {isMarathi ? 'फूट (Feet)' : 'Feet'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Water Struck / Bearing */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {isMarathi ? 'लागलेले पाणी' : 'Water Struck / Bearing'}
              </Text>
              <View style={styles.inputWithUnitRow}>
                <TextInput
                  value={billing.waterBearing}
                  onChangeText={text => dispatch(setWaterBearing(text))}
                  placeholder="10"
                  keyboardType="numeric"
                  placeholderTextColor={colors.gray400}
                  style={[styles.textInput, styles.flexInput]}
                />
                <View style={styles.unitBadge}>
                  <Text style={styles.unitBadgeText}>
                    {isMarathi ? 'इंच (Inch)' : 'Inch'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Bore Size */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {isMarathi ? 'बोर साईज' : 'Bore Size'}
              </Text>
              <View style={styles.inputWithUnitRow}>
                <TextInput
                  value={billing.boreSize}
                  onChangeText={text => dispatch(setBoreSize(text))}
                  placeholder="6"
                  keyboardType="numeric"
                  placeholderTextColor={colors.gray400}
                  style={[styles.textInput, styles.flexInput]}
                />
                <View style={styles.unitBadge}>
                  <Text style={styles.unitBadgeText}>
                    {isMarathi ? 'इंच (Inch)' : 'Inch'}
                  </Text>
                </View>
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
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  inputWithUnitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flexInput: {
    flex: 1,
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
  unitBadge: {
    backgroundColor: '#FAF7F0',
    borderWidth: 1,
    borderColor: colors.borderMedium,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitBadgeText: {
    fontSize: 12,
    fontWeight: '700',
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
