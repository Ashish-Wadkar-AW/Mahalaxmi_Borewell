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
  addIncomeThunk,
  deleteIncomeThunk,
} from '../../redux/slices/financialSlice';
import { showFeedback } from '../../redux/slices/feedbackSlice';
import { IncomeEntity } from '../../types/database';
import { CalculationService } from '../../services/CalculationService';
import { useNavigation } from '@react-navigation/native';

export const IncomeScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();

  const { incomes, isLoading } = useAppSelector(state => state.financials);

  const currentLanguage = useAppSelector(state => state.language.currentLanguage);
  const isMarathi = currentLanguage === 'mr';

  const [modalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Borewell Service');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [clientSource, setClientSource] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'bank_transfer' | 'cheque'>('cash');

  useEffect(() => {
    dispatch(fetchFinancialsThunk());
  }, [dispatch]);

  const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);

  const handleSaveIncome = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      dispatch(
        showFeedback({
          type: 'warning',
          title: isMarathi ? 'अवैध रक्कम' : 'Invalid Amount',
          message: isMarathi
            ? 'कृपया वैध धन रक्कम प्रविष्ट करा.'
            : 'Please enter a valid positive income amount.',
        }),
      );
      return;
    }

    const newIncome: IncomeEntity = {
      id: 'inc_' + Date.now(),
      amount: numAmount,
      category: category.trim() || (isMarathi ? 'सामान्य जमा' : 'General Income'),
      date: date.trim() || new Date().toISOString().split('T')[0],
      description: description.trim(),
      paymentMethod,
      clientSource: clientSource.trim() || (isMarathi ? 'ग्राहक' : 'Client'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dispatch(addIncomeThunk(newIncome));
    dispatch(
      showFeedback({
        type: 'success',
        title: isMarathi ? 'जमा नोंदवली' : 'Income Recorded',
        message: isMarathi
          ? `यशस्वीरित्या ${CalculationService.formatIndianCurrency(numAmount)} जमा नोंदवले.`
          : `Successfully recorded ${CalculationService.formatIndianCurrency(numAmount)} in income.`,
      }),
    );

    setModalVisible(false);
    setAmount('');
    setDescription('');
    setClientSource('');
  };

  const handleDelete = (id: string) => {
    dispatch(
      showFeedback({
        type: 'confirmation',
        title: isMarathi ? 'नोंद हटवायची का?' : 'Delete Income Record?',
        message: isMarathi
          ? 'तुम्हाला नक्की ही जमा नोंद हटवायची आहे का?'
          : 'Are you sure you want to remove this income entry?',
        confirmText: isMarathi ? 'हटवा' : 'Delete',
        cancelText: isMarathi ? 'रद्द करा' : 'Cancel',
        onConfirm: () => {
          dispatch(deleteIncomeThunk(id));
        },
      }),
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isMarathi ? 'जमा नोंदी' : 'Income Records'}
        subtitle={`${isMarathi ? 'एकूण जमा:' : 'Total:'} ${CalculationService.formatIndianCurrency(totalIncome)}`}
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
            {isMarathi ? 'एकूण नोंदवलेली जमा रक्कम' : 'Total Income Logged'}
          </Text>
          <Text style={styles.summaryValue}>
            {CalculationService.formatIndianCurrency(totalIncome)}
          </Text>
        </View>
        <Button
          title={isMarathi ? 'जमा नोंदवा' : 'Add Income'}
          size="sm"
          icon="add"
          onPress={() => setModalVisible(true)}
        />
      </View>

      <FlatList
        data={incomes}
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
                +{CalculationService.formatIndianCurrency(item.amount)}
              </Text>
            </View>

            <View style={styles.recordBody}>
              {item.clientSource ? (
                <Text style={styles.clientSource}>
                  {isMarathi ? 'स्रोत / ग्राहक: ' : 'From: '}
                  <Text style={styles.boldText}>{item.clientSource}</Text>
                </Text>
              ) : null}
              {item.description ? (
                <Text style={styles.descriptionText}>{item.description}</Text>
              ) : null}
            </View>

            <View style={styles.recordFooter}>
              <Badge
                label={
                  item.paymentMethod === 'cash'
                    ? isMarathi ? 'रोख' : 'Cash'
                    : item.paymentMethod === 'upi'
                    ? 'UPI'
                    : item.paymentMethod === 'bank_transfer'
                    ? isMarathi ? 'बँक' : 'Bank Transfer'
                    : isMarathi ? 'चेक' : 'Cheque'
                }
                variant="info"
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
            <Icon name="rupee" size={48} color={colors.gray400} />
            <Text style={styles.emptyTitle}>
              {isMarathi ? 'कोणतीही जमा रक्कम नोंदवलेली नाही' : 'No Income Recorded'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {isMarathi
                ? 'ग्राहकांकडून मिळालेली देयके व बोअरवेल महसूल नोंदवण्यासाठी वरील "+ जमा नोंदवा" बटणावर टॅप करा.'
                : 'Tap the "+ Add Income" button above to log received client payments and borewell revenues.'}
            </Text>
          </View>
        }
      />

      {/* Add Income Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isMarathi ? 'नवीन जमा नोंदवा' : 'Record New Income'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Input
                label={isMarathi ? 'रक्कम' : 'Amount'}
                value={amount}
                onChangeText={setAmount}
                placeholder={isMarathi ? 'उदा. २५०००' : 'e.g. 25000'}
                keyboardType="numeric"
                prefix="₹"
                required
              />

              <Input
                label={isMarathi ? 'प्रवर्ग (Category)' : 'Category'}
                value={category}
                onChangeText={setCategory}
                placeholder={
                  isMarathi
                    ? 'बोअरवेल सेवा, देखभाल, फिटिंग'
                    : 'Borewell Service, Maintenance, Fitting'
                }
              />

              <Input
                label={isMarathi ? 'ग्राहक / स्रोत' : 'Client / Source'}
                value={clientSource}
                onChangeText={setClientSource}
                placeholder={
                  isMarathi
                    ? 'ग्राहकाचे नांव किंवा संस्था'
                    : 'Client Name or Firm'
                }
              />

              <Input
                label={isMarathi ? 'तारीख' : 'Date'}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
              />

              {/* Payment Method Selector */}
              <Text style={styles.methodLabel}>
                {isMarathi ? 'पेमेंट पद्धत' : 'Payment Method'}
              </Text>
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
                      {m === 'cash'
                        ? isMarathi ? 'रोख' : 'CASH'
                        : m === 'upi'
                        ? 'UPI'
                        : m === 'bank_transfer'
                        ? isMarathi ? 'बँक' : 'BANK'
                        : isMarathi ? 'चेक' : 'CHEQUE'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label={isMarathi ? 'तपशील / टीप' : 'Description / Notes'}
                value={description}
                onChangeText={setDescription}
                placeholder={
                  isMarathi
                    ? 'ऐच्छिक तपशील किंवा नोंदी'
                    : 'Optional notes or details'
                }
                multiline
                numberOfLines={2}
              />

              <Button
                title={isMarathi ? 'जमा नोंद जतन करा' : 'Save Income Record'}
                onPress={handleSaveIncome}
                icon="save"
                style={styles.saveIncomeBtn}
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
    color: colors.success,
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
    color: colors.success,
  },
  recordBody: {
    marginBottom: spacing.sm,
  },
  clientSource: {
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
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  methodBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  methodBtnTextActive: {
    color: colors.textLight,
  },
  saveIncomeBtn: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
});
