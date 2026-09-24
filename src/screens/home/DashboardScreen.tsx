import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { Icon } from '../../components/common/Icon';
import { RigLogo } from '../../components/common/RigLogo';
import { Badge } from '../../components/common/Badge';
import { RevenueBarChart } from '../../components/charts/RevenueBarChart';
import { IncomeExpenseComparisonChart } from '../../components/charts/IncomeExpenseComparisonChart';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  fetchDashboardMetricsThunk,
  setDashboardFilter,
  DashboardFilter,
} from '../../redux/slices/dashboardSlice';
import { setLanguage } from '../../redux/slices/languageSlice';
import { CalculationService } from '../../services/CalculationService';
import { useNavigation } from '@react-navigation/native';

export const DashboardScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();

  const language = useAppSelector(state => state.language.currentLanguage);
  const isMarathi = language === 'mr';

  const {
    filter,
    revenue,
    income,
    expenses,
    netBalance,
    chartData,
    upcomingReminders,
    isLoading,
  } = useAppSelector(state => state.dashboard);

  useEffect(() => {
    dispatch(fetchDashboardMetricsThunk(filter));
  }, [dispatch, filter]);

  const onRefresh = () => {
    dispatch(fetchDashboardMetricsThunk(filter));
  };

  const handleFilterChange = (f: DashboardFilter) => {
    dispatch(setDashboardFilter(f));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top App Bar with Rig Logo, Sacred Header, and Language Switcher */}
      <View style={styles.appBar}>
        <View style={styles.brandRow}>
          <RigLogo size={36} color={colors.primary} showText={false} />
          <View style={styles.brandTextContainer}>
            <Text style={styles.sacredTop}>
              {isMarathi ? '|| श्री जोतिर्लिंग प्रसन्न ||' : '|| Shri Jyotirling Prasann ||'}
            </Text>
            <Text style={styles.brandTitle}>
              {isMarathi ? 'महालक्ष्मी बोरवेल' : 'Mahalaxmi Borewell'}
            </Text>
          </View>
        </View>

        {/* Language Switcher on Dashboard (Replacing New Bill) */}
        <View style={styles.langToggle}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => dispatch(setLanguage('mr'))}
            style={[styles.langBtn, isMarathi && styles.langBtnActive]}>
            <Text style={[styles.langText, isMarathi && styles.langTextActive]}>
              मराठी
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => dispatch(setLanguage('en'))}
            style={[styles.langBtn, !isMarathi && styles.langBtnActive]}>
            <Text style={[styles.langText, !isMarathi && styles.langTextActive]}>
              EN
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }>
        {/* Timeline Filters */}
        <View style={styles.filterRow}>
          {(
            [
              { key: '15_days', label: isMarathi ? '१५ दिवस' : '15 Days' },
              { key: '1_month', label: isMarathi ? '१ महिना' : '1 Month' },
              { key: '3_months', label: isMarathi ? '३ महिने' : '3 Months' },
              { key: '6_months', label: isMarathi ? '६ महिने' : '6 Months' },
            ] as const
          ).map(f => (
            <TouchableOpacity
              key={f.key}
              onPress={() => handleFilterChange(f.key)}
              style={[
                styles.filterPill,
                filter === f.key && styles.filterPillActive,
              ]}>
              <Text
                style={[
                  styles.filterPillText,
                  filter === f.key && styles.filterPillTextActive,
                ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 4 Primary Financial Metric Cards */}
        <View style={styles.metricsGrid}>
          {/* Revenue */}
          <View style={[styles.metricCard, styles.metricBorderRed]}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>
                {isMarathi ? 'एकूण महसूल' : 'Total Revenue'}
              </Text>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryMuted }]}>
                <Icon name="fileText" size={16} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.metricAmount}>
              {CalculationService.formatIndianCurrency(revenue)}
            </Text>
            <Text style={styles.metricSub}>
              {isMarathi ? 'इनव्हॉइस कोटेशन्स मधून' : 'From Invoiced Quotations'}
            </Text>
          </View>

          {/* Income */}
          <View style={[styles.metricCard, styles.metricBorderGreen]}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>
                {isMarathi ? 'जमा रक्कम' : 'Income Received'}
              </Text>
              <View style={[styles.iconCircle, { backgroundColor: colors.successBg }]}>
                <Icon name="trendingUp" size={16} color={colors.success} />
              </View>
            </View>
            <Text style={[styles.metricAmount, { color: colors.success }]}>
              {CalculationService.formatIndianCurrency(income)}
            </Text>
            <Text style={styles.metricSub}>
              {isMarathi ? 'ग्राहकांच्या पेमेंट मधून' : 'From Client Payments'}
            </Text>
          </View>

          {/* Expenses / Outcome */}
          <View style={[styles.metricCard, styles.metricBorderDanger]}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>
                {isMarathi ? 'खर्च / आउटकम' : 'Expense / Outcome'}
              </Text>
              <View style={[styles.iconCircle, { backgroundColor: colors.dangerBg }]}>
                <Icon name="trendingDown" size={16} color={colors.danger} />
              </View>
            </View>
            <Text style={[styles.metricAmount, { color: colors.danger }]}>
              {CalculationService.formatIndianCurrency(expenses)}
            </Text>
            <Text style={styles.metricSub}>
              {isMarathi ? 'पाईप, डिझेल, मजुरी, केबल' : 'Pipes, Fuel, Labor, Cable'}
            </Text>
          </View>

          {/* Net Balance / Profit */}
          <View style={[styles.metricCard, styles.metricBorderMaroon]}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>
                {isMarathi ? 'निव्वळ नफा / बाकी' : 'Net Balance / Profit'}
              </Text>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryMuted }]}>
                <Icon name="rupee" size={16} color={colors.primary} />
              </View>
            </View>
            <Text
              style={[
                styles.metricAmount,
                { color: netBalance >= 0 ? colors.primary : colors.danger },
              ]}>
              {CalculationService.formatIndianCurrency(netBalance)}
            </Text>
            <Text style={styles.metricSub}>
              {isMarathi ? 'महसूल + जमा - खर्च' : 'Revenue + Income - Outcome'}
            </Text>
          </View>
        </View>

        {/* Dynamic Charts Section */}
        <RevenueBarChart data={chartData} isMarathi={isMarathi} />
        <IncomeExpenseComparisonChart data={chartData} isMarathi={isMarathi} />

        {/* Upcoming Reminders Section */}
        <View style={styles.remindersBox}>
          <View style={styles.remindersHeader}>
            <View style={styles.remindersTitleRow}>
              <Icon name="clock" size={18} color={colors.primary} />
              <Text style={styles.remindersTitle}>
                {isMarathi ? 'आगामी स्मरणपत्रे' : 'Upcoming Reminders'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('MoreTab', { screen: 'Reminders' })}>
              <Text style={styles.viewAllText}>
                {isMarathi ? 'सर्व पहा' : 'View All'}
              </Text>
            </TouchableOpacity>
          </View>

          {upcomingReminders.length > 0 ? (
            upcomingReminders.map(rem => (
              <View key={rem.id} style={styles.reminderRow}>
                <View style={styles.reminderDot} />
                <View style={styles.reminderContent}>
                  <Text style={styles.reminderTitle} numberOfLines={1}>
                    {rem.title}
                  </Text>
                  <Text style={styles.reminderMeta}>
                    {rem.date} • {rem.time}
                  </Text>
                </View>
                <Badge
                  label={
                    isMarathi
                      ? rem.priority === 'high'
                        ? 'तातडीचे'
                        : rem.priority === 'medium'
                        ? 'मध्यम'
                        : 'कमी'
                      : rem.priority
                  }
                  variant={rem.priority === 'high' ? 'danger' : 'warning'}
                  size="sm"
                />
              </View>
            ))
          ) : (
            <View style={styles.noReminders}>
              <Text style={styles.noRemindersText}>
                {isMarathi ? 'कोणतीही प्रलंबित स्मरणपत्रे नाहीत' : 'No pending reminders'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandTextContainer: {},
  sacredTop: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  langToggle: {
    flexDirection: 'row',
    backgroundColor: '#FAF7F0',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#D4C6AB',
    overflow: 'hidden',
  },
  langBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  langBtnActive: {
    backgroundColor: colors.primary,
  },
  langText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#554B42',
  },
  langTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray100,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: colors.textLight,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricCard: {
    width: '48.5%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    ...shadows.sm,
  },
  metricBorderRed: {
    borderColor: colors.primaryMuted,
  },
  metricBorderGreen: {
    borderColor: colors.successBg,
  },
  metricBorderDanger: {
    borderColor: colors.dangerBg,
  },
  metricBorderMaroon: {
    borderColor: colors.borderLight,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    flex: 1,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    marginVertical: 2,
  },
  metricSub: {
    fontSize: 9,
    color: colors.textMuted,
  },
  remindersBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  remindersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  remindersTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  remindersTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  reminderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  reminderMeta: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  noReminders: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  noRemindersText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
