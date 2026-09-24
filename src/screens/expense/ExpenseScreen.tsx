import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import { Badge } from '../../components/common/Badge';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  fetchFinancialsThunk,
  addExpenseThunk,
  deleteExpenseThunk,
} from '../../redux/slices/financialSlice';
import { showFeedback } from '../../redux/slices/feedbackSlice';
import { ExpenseEntity } from '../../types/database';
import { CalculationService } from '../../services/CalculationService';
import { useNavigation } from '@react-navigation/native';

export const ExpenseScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();

  const { expenses, isLoading } = useAppSelector(state => state.financials);

  const currentLanguage = useAppSelector(state => state.language.currentLanguage);
  const isMarathi = currentLanguage === 'mr';

  const [modalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Pipes & Cables');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [vendorPerson, setVendorPerson] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'bank_transfer' | 'cheque'>('cash');

  useEffect(() => {
    dispatch(fetchFinancialsThunk());
  }, [dispatch]);

  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);

  const handleSaveExpense = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      dispatch(
        showFeedback({
          type: 'warning',
          title: isMarathi ? 'अवैध रक्कम' : 'Invalid Amount',
          message: isMarathi
            ? 'कृपया वैध धन रक्कम प्रविष्ट करा.'
            : 'Please enter a valid positive expense amount.',
        }),
      );
      return;
    }

    const newExpense: ExpenseEntity = {
      id: 'exp_' + Date.now(),
      amount: numAmount,
      category: category.trim() || (isMarathi ? 'सामान्य खर्च' : 'General Outcome'),
      date: date.trim() || new Date().toISOString().split('T')[0],
      description: description.trim(),
      paymentMethod,
      vendorPerson: vendorPerson.trim() || (isMarathi ? 'विक्रेता / व्यक्ती' : 'Vendor'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dispatch(addExpenseThunk(newExpense));
    dispatch(
      showFeedback({
        type: 'success',
        title: isMarathi ? 'खर्च नोंदवला' : 'Expense Recorded',
        message: isMarathi
          ? `यशस्वीरित्या ${CalculationService.formatIndianCurrency(numAmount)} खर्च नोंदवला.`
          : `Successfully recorded ${CalculationService.formatIndianCurrency(numAmount)} in expense / outcome.`,
      }),
    );

    setModalVisible(false);
    setAmount('');
    setDescription('');
    setVendorPerson('');
  };

  const handleDelete = (id: string) => {
    dispatch(
      showFeedback({
        type: 'confirmation',
        title: isMarathi ? 'नोंद हटवायची का?' : 'Delete Expense / Outcome?',
        message: isMarathi
          ? 'तुम्हाला नक्की ही खर्च नोंद हटवायची आहे का?'
          : 'Are you sure you want to remove this expense entry?',
        confirmText: isMarathi ? 'हटवा' : 'Delete',
        cancelText: isMarathi ? 'रद्द करा' : 'Cancel',
        onConfirm: () => {
          dispatch(deleteExpenseThunk(id));
        },
      }),
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isMarathi ? 'खर्च / जावक' : 'Expense / Outcome'}
        subtitle={`${isMarathi ? 'एकूण खर्च:' : 'Total:'} ${CalculationService.formatIndianCurrency(totalExpense)}`}
        showBack
        onBackPress={() => navigation.goBack()}
        rightAction={{
          icon: 'add',
          onPress: () => setModalVisible(true),
        }}
      />

      {/* Summary Banner */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryLabel}>
            {isMarathi ? 'एकूण खर्च / जावक' : 'Total Expense / Outcome'}
          </Text>
          <Text style={styles.summaryValue}>
            {CalculationService.formatIndianCurrency(totalExpense)}
          </Text>
        </View>
        <Button
          title={isMarathi ? 'खर्च नोंदवा' : 'Add Expense'}
          variant="danger"
          size="sm"
          icon="add"
          onPress={() => setModalVisible(true)}
        />
      </View>

      <FlatList
        data={expenses}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.recordCard}>
            <View style={styles.recordHeader}>
              <View>
                <Text style={styles.recordCategory}>{item.category}</Text>
                <Text style={styles.recordDate}>{item.date}</Text>
              </View>
              <Text style={styles.recordAmount}>
                -{CalculationService.formatIndianCurrency(item.amount)}
              </Text>
            </View>

            <View style={styles.recordBody}>
              {item.vendorPerson ? (
                <Text style={styles.vendorText}>
                  Vendor / Person: <Text style={styles.boldText}>{item.vendorPerson}</Text>
                </Text>
              ) : null}
              {item.description ? (
                <Text style={styles.descriptionText}>{item.description}</Text>
              ) : null}
            </View>

            <View style={styles.recordFooter}>
              <Badge
                label={item.paymentMethod.replace('_', ' ')}
                variant="neutral"
                size="sm"
              />
              <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                style={styles.deleteBtn}>
                <Icon name="trash" size={16} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="trendingDown" size={48} color={colors.gray400} />
            <Text style={styles.emptyTitle}>No Expenses Logged</Text>
            <Text style={styles.emptySubtitle}>
              Tap the "+ Add Expense" button above to log borewell equipment, fuel, transport, and labor expenses.
            </Text>
          </View>
        }
      />

      {/* Add Expense Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Expense / Outcome</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Input
                label="Amount"
                value={amount}
                onChangeText={setAmount}
                placeholder="e.g. 15000"
                keyboardType="numeric"
                prefix="₹"
                required
              />

              <Input
                label="Category"
                value={category}
                onChangeText={setCategory}
                placeholder="Pipes, Wire Cable, Transport, Labor, Fuel"
              />

              <Input
                label="Vendor / Person"
                value={vendorPerson}
                onChangeText={setVendorPerson}
                placeholder="Supplier, Driver, or Technician"
              />

              <Input
                label="Date"
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
              />

              {/* Payment Method */}
              <Text style={styles.methodLabel}>Payment Method</Text>
              <View style={styles.methodRow}>
                {(['cash', 'upi', 'bank_transfer', 'cheque'] as const).map(m => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setPaymentMethod(m)}
                    style={[
                      styles.methodBtn,
                      paymentMethod === m && styles.methodBtnActive,
                    ]}>
                    <Text
                      style={[
                        styles.methodBtnText,
                        paymentMethod === m && styles.methodBtnTextActive,
                      ]}>
                      {m === 'bank_transfer' ? 'Bank' : m.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Description / Purpose"
                value={description}
                onChangeText={setDescription}
                placeholder="Details of the expenditure"
                multiline
                numberOfLines={2}
              />

              <Button
                title="Save Expense / Outcome"
                variant="danger"
                onPress={handleSaveExpense}
                icon="save"
                style={styles.saveExpenseBtn}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  summaryLeft: {},
  summaryLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.danger,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  recordCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  recordCategory: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  recordDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  recordAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.danger,
  },
  recordBody: {
    marginBottom: spacing.sm,
  },
  vendorText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  boldText: {
    fontWeight: '700',
  },
  descriptionText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  recordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  deleteBtn: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalBody: {},
  methodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  methodRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  methodBtnActive: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  methodBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  methodBtnTextActive: {
    color: colors.textLight,
  },
  saveExpenseBtn: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
});
