import React, { useState, useEffect, useRef } from 'react';
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
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { showFeedback } from '../../redux/slices/feedbackSlice';
import { fetchInvoicesThunk } from '../../redux/slices/invoiceSlice';
import { fetchQuotationsThunk } from '../../redux/slices/quotationSlice';
import { CalculationService } from '../../services/CalculationService';
import { formatParticularsText, numberToWordsMarathi } from '../../utils/quotationFormatters';
import { InvoiceRepository } from '../../database/repositories/InvoiceRepository';
import { QuotationEntity } from '../../types/database';

interface EditableInvoiceItem {
  srNo: number;
  particularsMr: string;
  particularsEn: string;
  quantity: string;
  rate: string;
  total: number;
  specs: Record<string, any>;
}

export const FinalInvoiceAdjustmentScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const isMarathi = useAppSelector(state => state.language.currentLanguage === 'mr');
  const quotation: QuotationEntity = route.params.quotation;
  const qNumber = quotation.quotationNumber || quotation.billNumber || 'Q-001';

  const [invoiceNumber, setInvoiceNumber] = useState('INV-...');
  const [items, setItems] = useState<EditableInvoiceItem[]>([]);
  const [grandTotal, setGrandTotal] = useState(quotation.totalAmount || 0);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'partial'>(
    (quotation.paymentStatus as any) || 'pending',
  );
  const [paidAmount, setPaidAmount] = useState(
    quotation.paidAmount ? quotation.paidAmount.toString() : '0',
  );
  const [remainingAmount, setRemainingAmount] = useState(
    quotation.remainingAmount !== undefined ? quotation.remainingAmount : quotation.totalAmount,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  useEffect(() => {
    // Generate next invoice number
    InvoiceRepository.getNextInvoiceNumber().then(num => setInvoiceNumber(num));

    // Copy quotation items as initial state
    if (quotation.items && quotation.items.length > 0) {
      const initialItems: EditableInvoiceItem[] = quotation.items.map(it => {
        let parsedSpecs: Record<string, any> = {};
        if (it.itemSpecs) {
          try {
            parsedSpecs = JSON.parse(it.itemSpecs);
          } catch {}
        }
        return {
          srNo: it.srNo,
          particularsMr: it.particularsMr,
          particularsEn: it.particularsEn,
          quantity: it.quantity > 0 ? it.quantity.toString() : '',
          rate: it.rate > 0 ? it.rate.toString() : '',
          total: it.total,
          specs: parsedSpecs,
        };
      });
      setItems(initialItems);
      recalculateTotals(initialItems, paymentStatus, paidAmount);
    }
  }, [quotation]);

  const recalculateTotals = (
    currentItems: EditableInvoiceItem[],
    pStatus: 'pending' | 'paid' | 'partial',
    pPaidText: string,
  ) => {
    const total = CalculationService.calculateGrandTotal(
      currentItems.map(it => ({
        quantity: parseFloat(it.quantity) || 0,
        rate: parseFloat(it.rate) || 0,
      })),
    );
    setGrandTotal(total);

    let paidNum = parseFloat(pPaidText) || 0;
    let remNum = 0;
    if (pStatus === 'paid') {
      paidNum = total;
      setPaidAmount(total.toString());
      remNum = 0;
      setRemainingAmount(0);
    } else if (pStatus === 'pending') {
      paidNum = 0;
      setPaidAmount('0');
      remNum = total;
      setRemainingAmount(total);
    } else {
      paidNum = Math.min(paidNum, total);
      remNum = Math.max(0, Math.round((total - paidNum + Number.EPSILON) * 100) / 100);
      setRemainingAmount(remNum);
    }

    console.log('[PAYMENT][CALCULATION]', {
      totalAmount: total,
      paymentStatus: pStatus,
      paidAmount: paidNum,
      remainingAmount: remNum,
    });
  };

  const handleItemQuantityChange = (index: number, val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, '');
    const newItems = [...items];
    newItems[index].quantity = cleaned;
    const q = parseFloat(cleaned) || 0;
    const r = parseFloat(newItems[index].rate) || 0;
    newItems[index].total = CalculationService.calculateLineTotal(q, r);
    setItems(newItems);
    recalculateTotals(newItems, paymentStatus, paidAmount);
  };

  const handleItemRateChange = (index: number, val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, '');
    const newItems = [...items];
    newItems[index].rate = cleaned;
    const q = parseFloat(newItems[index].quantity) || 0;
    const r = parseFloat(cleaned) || 0;
    newItems[index].total = CalculationService.calculateLineTotal(q, r);
    setItems(newItems);
    recalculateTotals(newItems, paymentStatus, paidAmount);
  };

  const handlePaymentStatusChange = (newStatus: 'pending' | 'paid' | 'partial') => {
    setPaymentStatus(newStatus);
    recalculateTotals(items, newStatus, paidAmount);
  };

  const handlePaidAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    setPaidAmount(cleaned);
    const p = parseFloat(cleaned) || 0;
    const rem = Math.max(0, Math.round((grandTotal - p + Number.EPSILON) * 100) / 100);
    setRemainingAmount(rem);

    console.log('[PAYMENT][CALCULATION]', {
      totalAmount: grandTotal,
      paymentStatus,
      paidAmount: p,
      remainingAmount: rem,
    });
  };

  const handleCreateInvoice = async () => {
    if (submitLockRef.current || isSubmitting) return;
    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
      if (grandTotal <= 0) {
        dispatch(
          showFeedback({
            type: 'error',
            title: isMarathi ? 'अवैध रक्कम' : 'Validation Error',
            message: isMarathi
              ? 'कृपया किमान एका वस्तूचे वैध प्रमाण (Qty) व दर (Rate) प्रविष्ट करा.'
              : 'Please enter valid quantity and rate for at least one item.',
          }),
        );
        return;
      }

      if (paymentStatus === 'partial') {
        const pCheck = parseFloat(paidAmount) || 0;
        if (pCheck > grandTotal) {
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
        if (pCheck < 0) {
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

      const pNum =
        paymentStatus === 'paid'
          ? grandTotal
          : paymentStatus === 'pending'
          ? 0
          : Math.min(parseFloat(paidAmount) || 0, grandTotal);
      const remNum = Math.max(0, Math.round((grandTotal - pNum + Number.EPSILON) * 100) / 100);

      const mrWords = numberToWordsMarathi(grandTotal);
      const enWords = CalculationService.numberToWordsIndian(grandTotal);

      const invoiceData = {
        invoiceNumber,
        billId: quotation.id,
        sourceQuotationId: quotation.id,
        sourceQuotationNumber: qNumber,
        customerId: quotation.customerId || '',
        customerName: quotation.customerName,
        customerPhone: quotation.customerPhone || '',
        customerAddress: quotation.customerAddress || '',
        date: new Date().toISOString().split('T')[0],
        borewellDepth: quotation.borewellDepth || 0,
        waterBearing: quotation.waterBearing || 0,
        boreSize: quotation.boreSize || 0,
        deliveryDays: quotation.deliveryDays || 7,
        amountInWords: isMarathi ? mrWords : enWords,
        amountInWordsMarathi: mrWords,
        amountInWordsEnglish: enWords,
        subtotal: grandTotal,
        taxAmount: 0,
        grandTotal,
        paymentStatus,
        paidAmount: pNum,
        remainingAmount: remNum,
        notes: `Generated from Quotation #${qNumber}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const invoiceItemsData = items.map(it => ({
        srNo: it.srNo,
        description: isMarathi ? it.particularsMr : it.particularsEn,
        particularsMr: it.particularsMr,
        particularsEn: it.particularsEn,
        quantity: parseFloat(it.quantity) || 0,
        rate: parseFloat(it.rate) || 0,
        total: it.total,
        itemSpecs: JSON.stringify(it.specs || {}),
      }));

      const createdInvoice = await InvoiceRepository.createInvoiceFromQuotation(
        quotation.id,
        invoiceData,
        invoiceItemsData,
      );

      // Refresh slices
      dispatch(fetchInvoicesThunk());
      dispatch(fetchQuotationsThunk());

      dispatch(
        showFeedback({
          type: 'success',
          title: isMarathi ? 'इनव्हॉइस यशस्वीरित्या तयार झाले!' : 'Invoice Created Successfully!',
          message: isMarathi
            ? `कोटेशन #${qNumber} मधून अंतिम इनव्हॉइस #${createdInvoice.invoiceNumber} तयार झाले.`
            : `Final invoice #${createdInvoice.invoiceNumber} generated from Quotation #${qNumber}.`,
          confirmText: isMarathi ? 'इनव्हॉइस पहा' : 'View Invoice',
          onConfirm: () => {
            navigation.replace('InvoiceDetail', { invoice: createdInvoice });
          },
        }),
      );
    } catch (e: any) {
      dispatch(
        showFeedback({
          type: 'error',
          title: isMarathi ? 'त्रुटी' : 'Error',
          message: e.message || (isMarathi ? 'इनव्हॉइस तयार करता आले नाही.' : 'Failed to create invoice.'),
        }),
      );
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isMarathi ? 'अंतिम इनव्हॉइस तपशील' : 'Final Invoice Details'}
        subtitle={isMarathi ? 'कामाच्या प्रत्यक्ष खर्चाची नोंद' : 'Adjust actual work quantities & rates'}
        showBack
        onBackPress={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Source Quotation Banner */}
          <View style={styles.sourceQuotationBanner}>
            <View style={styles.sourceQuoteIconCol}>
              <Icon name="fileText" size={24} color={colors.primary} />
            </View>
            <View style={styles.sourceQuoteInfoCol}>
              <View style={styles.sourceQuoteRow}>
                <Text style={styles.sourceQuoteLabel}>
                  {isMarathi ? 'संदर्भ कोटेशन :' : 'Source Quotation :'}
                </Text>
                <Text style={styles.sourceQuoteVal}>{qNumber}</Text>
              </View>
              <Text style={styles.sourceQuoteNotice}>
                {isMarathi
                  ? `मूळ कोटेशन रक्कम: ₹ ${quotation.totalAmount.toLocaleString('en-IN')} (अपरिवर्तित राहील)`
                  : `Original quote: ₹ ${quotation.totalAmount.toLocaleString('en-IN')} (will remain unchanged)`}
              </Text>
            </View>
          </View>

          {/* New Invoice Number & Customer Info */}
          <View style={styles.metaCard}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{isMarathi ? 'नवीन इनव्हॉइस नं. :' : 'New Invoice # :'}</Text>
              <Text style={styles.metaInvoiceNum}>{invoiceNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{isMarathi ? 'ग्राहक नांव :' : 'Customer :'}</Text>
              <Text style={styles.metaCustomerName}>{quotation.customerName}</Text>
            </View>
            {quotation.customerPhone ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>{isMarathi ? 'फोन नंबर :' : 'Phone :'}</Text>
                <Text style={styles.metaSubVal}>{quotation.customerPhone}</Text>
              </View>
            ) : null}
          </View>

          {/* Section: Adjust Quantities & Rates */}
          <View style={styles.sectionHeaderBox}>
            <Text style={styles.sectionTitle}>
              {isMarathi ? 'साहित्य व कामाचा प्रत्यक्ष दर/नग बदला' : 'Adjust Material & Work Rates/Quantities'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {isMarathi
                ? 'प्रत्यक्ष कामात बदललेली नगसंख्या व दर येथे टाका. एकूण रक्कम आपोआप बदलेल.'
                : 'Modify final quantities or rates. Line totals recalculate automatically.'}
            </Text>
          </View>

          {items.map((item, index) => {
            const formatted = formatParticularsText(
              item.srNo,
              item.specs || {},
              isMarathi ? 'mr' : 'en',
            );
            return (
              <View key={`final_inv_row_${item.srNo}`} style={styles.itemRowCard}>
                <View style={styles.itemTitleRow}>
                  <View style={styles.itemSrBadge}>
                    <Text style={styles.itemSrText}>#{item.srNo}</Text>
                  </View>
                  <View style={styles.itemTitleTextCol}>
                    <Text style={styles.itemTitleText}>{formatted.title}</Text>
                    {formatted.specsSubtitle ? (
                      <Text style={styles.itemSpecsSub}>{formatted.specsSubtitle}</Text>
                    ) : null}
                  </View>
                </View>

                {/* Inputs for Qty, Rate, Total */}
                <View style={styles.itemInputsRow}>
                  <View style={styles.inputColQty}>
                    <Text style={styles.colLabel}>{isMarathi ? 'नग (Qty)' : 'Quantity'}</Text>
                    <TextInput
                      style={styles.numericInput}
                      keyboardType="numeric"
                      value={item.quantity}
                      placeholder="0"
                      placeholderTextColor={colors.gray400}
                      onChangeText={val => handleItemQuantityChange(index, val)}
                    />
                  </View>

                  <View style={styles.inputColRate}>
                    <Text style={styles.colLabel}>{isMarathi ? 'दर (Rate ₹)' : 'Rate (₹)'}</Text>
                    <TextInput
                      style={styles.numericInput}
                      keyboardType="numeric"
                      value={item.rate}
                      placeholder="0.00"
                      placeholderTextColor={colors.gray400}
                      onChangeText={val => handleItemRateChange(index, val)}
                    />
                  </View>

                  <View style={styles.inputColTotal}>
                    <Text style={styles.colLabel}>{isMarathi ? 'एकूण (Total ₹)' : 'Total (₹)'}</Text>
                    <Text style={styles.lineTotalText}>
                      ₹ {item.total ? item.total.toLocaleString('en-IN') : '0.00'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}

          {/* Financial Summary & Final Price Comparison */}
          <View style={styles.grandSummaryCard}>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonCol}>
                <Text style={styles.comparisonLabel}>
                  {isMarathi ? 'कोटेशन अंदाज' : 'Original Quote'}
                </Text>
                <Text style={styles.comparisonOldVal}>
                  ₹ {quotation.totalAmount.toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={styles.comparisonDivider} />

              <View style={styles.comparisonCol}>
                <Text style={styles.comparisonLabel}>
                  {isMarathi ? 'अंतिम इनव्हॉइस एकूण' : 'Final Invoice Total'}
                </Text>
                <Text style={styles.comparisonNewVal}>
                  ₹ {grandTotal.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            {/* Payment Information */}
            <View style={styles.paymentSectionBox}>
              <Text style={styles.paymentSectionHeading}>
                {isMarathi ? 'पेमेंट स्थिती (Payment Status)' : 'Payment Status'}
              </Text>
              <View style={styles.paymentChipsRow}>
                {(['pending', 'partial', 'paid'] as const).map(st => (
                  <TouchableOpacity
                    key={st}
                    activeOpacity={0.7}
                    onPress={() => handlePaymentStatusChange(st)}
                    style={[
                      styles.paymentChip,
                      paymentStatus === st && styles.paymentChipActive,
                    ]}>
                    <Text
                      style={[
                        styles.paymentChipText,
                        paymentStatus === st && styles.paymentChipTextActive,
                      ]}>
                      {st === 'pending'
                        ? isMarathi ? 'देणे बाकी (Not Paid)' : 'Not Paid'
                        : st === 'partial'
                        ? isMarathi ? 'अॅडव्हान्स (Advance)' : 'Advance'
                        : isMarathi ? 'पूर्ण जमा (Paid)' : 'Paid'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {paymentStatus === 'partial' && (
                <View style={styles.paidInputRow}>
                  <Text style={styles.paidInputLabel}>
                    {isMarathi ? 'जमा रक्कम (Advance/Paid ₹) :' : 'Advance / Paid Amount (₹) :'}
                  </Text>
                  <TextInput
                    style={styles.paidInput}
                    keyboardType="numeric"
                    value={paidAmount}
                    onChangeText={handlePaidAmountChange}
                  />
                </View>
              )}

              <View style={styles.remainingSummaryRow}>
                <Text style={styles.remainingSummaryLabel}>
                  {isMarathi ? 'उर्वरित देणे बाकी (Remaining) :' : 'Remaining Amount :'}
                </Text>
                <Text
                  style={[
                    styles.remainingSummaryVal,
                    remainingAmount > 0 && styles.remainingAlert,
                  ]}>
                  ₹ {remainingAmount.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Create Invoice Action Footer */}
        <View style={styles.bottomBar}>
          <Button
            title={
              isSubmitting
                ? isMarathi ? 'तयार करत आहे...' : 'Creating Invoice...'
                : isMarathi ? 'अंतिम इनव्हॉइस तयार करा' : 'Create Final Invoice'
            }
            onPress={handleCreateInvoice}
            loading={isSubmitting}
            disabled={isSubmitting}
            icon="check"
            iconPosition="right"
            size="lg"
            variant="primary"
            style={styles.submitBtn}
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
  sourceQuotationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7E6',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#FFE2A8',
    marginBottom: spacing.sm,
  },
  sourceQuoteIconCol: {
    marginRight: spacing.sm,
  },
  sourceQuoteInfoCol: {
    flex: 1,
  },
  sourceQuoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceQuoteLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  sourceQuoteVal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    marginLeft: 4,
  },
  sourceQuoteNotice: {
    fontSize: 11,
    color: '#8A5B00',
    marginTop: 2,
    fontWeight: '600',
  },
  metaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#E2D7C3',
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  metaInvoiceNum: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  metaCustomerName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  metaSubVal: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  sectionHeaderBox: {
    marginVertical: spacing.xs,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemRowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: '#E8DFD0',
    ...shadows.sm,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  itemSrBadge: {
    backgroundColor: '#FAF7F0',
    borderRadius: borderRadius.xs,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#D4C6AB',
    marginRight: spacing.xs,
  },
  itemSrText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  itemTitleTextCol: {
    flex: 1,
  },
  itemTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  itemSpecsSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  itemInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputColQty: {
    width: '28%',
  },
  inputColRate: {
    width: '34%',
  },
  inputColTotal: {
    width: '34%',
    alignItems: 'flex-end',
  },
  colLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.gray400,
    marginBottom: 2,
  },
  numericInput: {
    backgroundColor: '#FAF7F0',
    borderWidth: 1,
    borderColor: '#D4C6AB',
    borderRadius: borderRadius.xs,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  lineTotalText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    paddingVertical: 7,
  },
  grandSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1.5,
    borderColor: '#D4C6AB',
    ...shadows.md,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EAD6',
  },
  comparisonCol: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#D4C6AB',
  },
  comparisonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  comparisonOldVal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray400,
  },
  comparisonNewVal: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
  },
  paymentSectionBox: {
    marginTop: spacing.sm,
  },
  paymentSectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  paymentChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  paymentChip: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 6,
    borderRadius: borderRadius.xs,
    backgroundColor: '#FAF7F0',
    borderWidth: 1,
    borderColor: '#D4C6AB',
    alignItems: 'center',
  },
  paymentChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  paymentChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  paymentChipTextActive: {
    color: '#FFFFFF',
  },
  paidInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  paidInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  paidInput: {
    width: 120,
    backgroundColor: '#FAF7F0',
    borderWidth: 1,
    borderColor: '#D4C6AB',
    borderRadius: borderRadius.xs,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'right',
  },
  remainingSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F0EAD6',
  },
  remainingSummaryLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  remainingSummaryVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2F855A',
  },
  remainingAlert: {
    color: colors.danger,
  },
  bottomBar: {
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2D7C3',
    ...shadows.lg,
  },
  submitBtn: {
    width: '100%',
  },
});
