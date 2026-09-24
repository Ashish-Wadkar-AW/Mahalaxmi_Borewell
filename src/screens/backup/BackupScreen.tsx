import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { showFeedback } from '../../redux/slices/feedbackSlice';
import { BackupService, ApplicationBackup } from '../../services/BackupService';
import { fetchDashboardMetricsThunk } from '../../redux/slices/dashboardSlice';
import { fetchInvoicesThunk } from '../../redux/slices/invoiceSlice';
import { fetchFinancialsThunk } from '../../redux/slices/financialSlice';
import { fetchRemindersThunk } from '../../redux/slices/reminderSlice';
import { useNavigation } from '@react-navigation/native';

export const BackupScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const currentLanguage = useAppSelector(state => state.language.currentLanguage);
  const isMarathi = currentLanguage === 'mr';

  const [exportedJson, setExportedJson] = useState('');
  const [importJson, setImportJson] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const json = await BackupService.createBackup();
      setExportedJson(json);
      dispatch(
        showFeedback({
          type: 'success',
          title: isMarathi ? 'बॅकअप तयार झाला' : 'Backup Generated',
          message: isMarathi
            ? 'डेटा बॅकअप यशस्वीरित्या तयार झाला. तुम्ही तो सुरक्षित कॉपी करू शकता.'
            : 'Backup was successfully generated. You can copy it safely.',
        }),
      );
    } catch (e: any) {
      dispatch(
        showFeedback({
          type: 'error',
          title: isMarathi ? 'बॅकअप अयशस्वी' : 'Export Failed',
          message: e.message || (isMarathi ? 'बॅकअप तयार करता आला नाही.' : 'Unable to generate backup.'),
        }),
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importJson.trim()) {
      dispatch(
        showFeedback({
          type: 'warning',
          title: isMarathi ? 'डेटा आवश्यक' : 'Missing Backup Data',
          message: isMarathi
            ? 'कृपया रिस्टोर करण्यासाठी बॅकअप डेटा पेस्ट करा.'
            : 'Please paste the backup content to import.',
        }),
      );
      return;
    }

    const validation = BackupService.validateBackup(importJson);
    if (!validation.isValid || !validation.parsed) {
      dispatch(
        showFeedback({
          type: 'error',
          title: isMarathi ? 'अवैध बॅकअप फाईल' : 'Invalid Backup File',
          message: validation.error || (isMarathi ? 'बॅकअप फाईल अवैध आहे.' : 'Unable to import backup. The backup file is invalid.'),
        }),
      );
      return;
    }

    const backup = validation.parsed;
    const summary = `Bills: ${backup.data.bills.length}\nInvoices: ${backup.data.invoices.length}\nIncome: ${backup.data.income.length}\nExpenses: ${backup.data.expenses.length}\nReminders: ${backup.data.reminders.length}`;

    // Confirm before overwrite
    dispatch(
      showFeedback({
        type: 'confirmation',
        title: isMarathi ? 'रिस्टोर खात्री' : 'Confirm Restore',
        message: isMarathi
          ? `तुम्हाला नक्की हा बॅकअप रिस्टोर करायचा आहे का? चालू नोंदी अपडेट होतील.\n\n${summary}`
          : `Are you sure you want to restore this backup? Existing records will be updated.\n\n${summary}`,
        confirmText: isMarathi ? 'रिस्टोर करा' : 'Restore Now',
        cancelText: isMarathi ? 'रद्द करा' : 'Cancel',
        onConfirm: async () => {
          setIsImporting(true);
          try {
            await BackupService.restoreBackup(backup);
            // Refresh all Redux caches
            dispatch(fetchDashboardMetricsThunk('1_month'));
            dispatch(fetchInvoicesThunk());
            dispatch(fetchFinancialsThunk());
            dispatch(fetchRemindersThunk());

            dispatch(
              showFeedback({
                type: 'success',
                title: isMarathi ? 'रिस्टोर यशस्वी' : 'Import Successful',
                message: isMarathi
                  ? 'सर्व आर्थिक व बिलिंग नोंदी यशस्वीरित्या पूर्ववत झाल्या आहेत.'
                  : 'Backup imported successfully. All financial records have been restored.',
              }),
            );
            setImportJson('');
          } catch (e: any) {
            dispatch(
              showFeedback({
                type: 'error',
                title: isMarathi ? 'रिस्टोर अयशस्वी' : 'Import Failed',
                message: e.message || (isMarathi ? 'बॅकअप रिस्टोर करता आला नाही.' : 'Failed to restore backup.'),
              }),
            );
          } finally {
            setIsImporting(false);
          }
        },
      }),
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isMarathi ? 'बॅकअप व रिस्टोर' : 'Backup & Restore'}
        subtitle={
          isMarathi
            ? 'डेटा सुरक्षित ठेवा व पूर्ववत करा'
            : 'Export and restore application data'
        }
        showBack
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Export Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Icon name="download" size={20} color={colors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.cardTitle}>
                {isMarathi ? 'डेटा बॅकअप काढा' : 'Export Backup'}
              </Text>
              <Text style={styles.cardSub}>
                {isMarathi
                  ? 'बिल, इनव्हॉइस, जमा, खर्च, स्मरणपत्रे आणि प्रोफाइल बॅकअप तयार करा.'
                  : 'Exports Bills, Invoices, Income, Expenses, Reminders, and Profile.'}
              </Text>
            </View>
          </View>

          <Button
            title={
              isExporting
                ? isMarathi
                  ? 'तयार करत आहे...'
                  : 'Generating...'
                : isMarathi
                ? 'डेटा बॅकअप काढा'
                : 'Export Backup Data'
            }
            onPress={handleExport}
            loading={isExporting}
            icon="download"
            size="md"
            style={styles.actionBtn}
          />

          {exportedJson ? (
            <View style={styles.outputBox}>
              <Text style={styles.outputLabel}>
                {isMarathi ? 'बॅकअप डेटा (कॉपी करण्यासाठी तयार):' : 'Backup Data (Ready to Copy):'}
              </Text>
              <TextInput
                value={exportedJson}
                editable={false}
                multiline
                style={styles.outputArea}
              />
            </View>
          ) : null}
        </View>

        {/* Import Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: colors.warningBg }]}>
              <Icon name="upload" size={20} color={colors.warning} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.cardTitle}>
                {isMarathi ? 'बॅकअप रिस्टोर करा' : 'Import Backup'}
              </Text>
              <Text style={styles.cardSub}>
                {isMarathi
                  ? 'मागील बॅकअप डेटा पेस्ट करून नोंदी पूर्ववत करा.'
                  : 'Paste backup data to restore records.'}
              </Text>
            </View>
          </View>

          <TextInput
            value={importJson}
            onChangeText={setImportJson}
            placeholder={
              isMarathi ? 'येथे बॅकअप डेटा पेस्ट करा...' : 'Paste backup data here...'
            }
            placeholderTextColor={colors.gray400}
            multiline
            numberOfLines={5}
            style={styles.inputArea}
          />

          <Button
            title={
              isImporting
                ? isMarathi
                  ? 'रिस्टोर करत आहे...'
                  : 'Restoring...'
                : isMarathi
                ? 'बॅकअप रिस्टोर करा'
                : 'Import Backup'
            }
            variant="outline"
            onPress={handleImport}
            loading={isImporting}
            icon="upload"
            size="md"
            style={styles.actionBtn}
          />
        </View>

        {/* Note */}
        <View style={styles.noticeBox}>
          <Icon name="alert" size={16} color={colors.textMuted} />
          <Text style={styles.noticeText}>
            {isMarathi
              ? 'बॅकअप रिस्टोर करताना तुमचे युजर खाते जतन केले जाते.'
              : 'Your user account is preserved during backup restore.'}
          </Text>
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
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  actionBtn: {
    marginTop: spacing.xs,
  },
  outputBox: {
    marginTop: spacing.md,
  },
  outputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  outputArea: {
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: 11,
    color: colors.textPrimary,
    maxHeight: 120,
    fontFamily: 'monospace',
  },
  inputArea: {
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: 12,
    color: colors.textPrimary,
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
  },
  noticeText: {
    fontSize: 11,
    color: colors.textMuted,
    flex: 1,
  },
});
