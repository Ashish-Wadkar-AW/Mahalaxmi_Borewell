import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { Header } from '../../components/common/Header';
import { Badge } from '../../components/common/Badge';
import { Icon } from '../../components/common/Icon';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { loadBillForEditing } from '../../redux/slices/billingSlice';
import { showFeedback } from '../../redux/slices/feedbackSlice';
import { InvoiceEntity, BillEntity } from '../../types/database';
import { useRoute, useNavigation } from '@react-navigation/native';
import { BillRepository } from '../../database/repositories/BillRepository';
import { InvoiceRepository } from '../../database/repositories/InvoiceRepository';
import { QuotationDocumentView } from '../../components/quotation/QuotationDocumentView';
import { updateInvoicePaymentStatusThunk } from '../../redux/slices/invoiceSlice';

export const InvoiceDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const [invoice, setInvoice] = useState<InvoiceEntity>(route.params.invoice);
  const [associatedBill, setAssociatedBill] = useState<BillEntity | null>(null);
  const [advanceInput, setAdvanceInput] = useState<string>(
    route.params.invoice?.paymentStatus === 'partial' && route.params.invoice?.paidAmount
      ? String(route.params.invoice.paidAmount)
      : '',
  );
  const [showAdvanceInput, setShowAdvanceInput] = useState<boolean>(
    route.params.invoice?.paymentStatus === 'partial',
  );
  const language = useAppSelector(state => state.language.currentLanguage);
  const isMarathi = language === 'mr';

  useEffect(() => {
    InvoiceRepository.getInvoiceById(invoice.id).then(fresh => {
      if (fresh) {
        setInvoice(fresh);
        if (fresh.paymentStatus === 'partial') {
          setAdvanceInput(fresh.paidAmount ? String(fresh.paidAmount) : '');
          setShowAdvanceInput(true);
        } else {
          setShowAdvanceInput(false);
        }
      }
    });

    const targetQuotationId = invoice.sourceQuotationId || invoice.billId;
    if (targetQuotationId) {
      BillRepository.getBillById(targetQuotationId).then(b => {
        if (b) {
          setAssociatedBill(b);
        }
      });
    }
  }, [invoice.id, invoice.billId, invoice.sourceQuotationId]);

  const handleStatusChange = async (
    newStatus: 'pending' | 'paid' | 'partial',
  ) => {
    if (newStatus === 'partial') {
      setShowAdvanceInput(true);
      const curPaid = invoice.paidAmount ?? 0;
      if (!advanceInput && curPaid > 0 && curPaid < invoice.grandTotal) {
        setAdvanceInput(String(curPaid));
      }
      return;
    }

    setShowAdvanceInput(false);
    let newPaid = 0;
    let newRemaining = invoice.grandTotal;

    if (newStatus === 'paid') {
      newPaid = invoice.grandTotal;
      newRemaining = 0;
    } else if (newStatus === 'pending') {
      newPaid = 0;
      newRemaining = invoice.grandTotal;
    }

    console.log('[PAYMENT][CALCULATION]', {
      totalAmount: invoice.grandTotal,
      paymentStatus: newStatus,
      paidAmount: newPaid,
      remainingAmount: newRemaining,
    });

    const result = await dispatch(
      updateInvoicePaymentStatusThunk({
        id: invoice.id,
        paymentStatus: newStatus,
        paidAmount: newPaid,
        remainingAmount: newRemaining,
      }),
    );
    if (updateInvoicePaymentStatusThunk.fulfilled.match(result) && result.payload) {
      setInvoice(result.payload);
      dispatch(
        showFeedback({
          type: 'success',
          title: isMarathi ? 'पेमेंट स्थिती अपडेट झाली' : 'Payment Status Updated',
          message: isMarathi
            ? `इनव्हॉइस स्थिती ${newStatus === 'paid'
              ? 'पूर्ण जमा'
              : 'देणे बाकी'
            } केली गेली.`
            : `Invoice status changed to ${newStatus === 'paid'
              ? 'PAID'
              : 'NOT PAID'
            }`,
        }),
      );
    }
  };

  const handleSaveAdvance = async () => {
    const rawAmt = parseFloat(advanceInput.trim() || '0');
    if (isNaN(rawAmt) || rawAmt < 0) {
      dispatch(
        showFeedback({
          type: 'error',
          title: isMarathi ? 'अवैध रक्कम' : 'Invalid Amount',
          message: isMarathi
            ? 'कृपया वैध अ‍ॅडव्हान्स रक्कम प्रविष्ट करा (>= 0).'
            : 'Please enter a valid advance amount (>= 0).',
        }),
      );
      return;
    }

    if (rawAmt > invoice.grandTotal) {
      dispatch(
        showFeedback({
          type: 'error',
          title: isMarathi ? 'अवैध अ‍ॅडव्हान्स रक्कम' : 'Invalid Advance Amount',
          message: isMarathi
            ? `अ‍ॅडव्हान्स रक्कम एकूण रकमेपेक्षा (₹${invoice.grandTotal.toLocaleString('en-IN')}) जास्त असू शकत नाही.`
            : `Advance amount cannot exceed Grand Total (₹${invoice.grandTotal.toLocaleString('en-IN')}).`,
        }),
      );
      return;
    }

    const roundedPaid = Math.round((rawAmt + Number.EPSILON) * 100) / 100;
    const roundedRemaining = Math.max(
      0,
      Math.round((invoice.grandTotal - roundedPaid + Number.EPSILON) * 100) / 100,
    );

    console.log('[PAYMENT][CALCULATION]', {
      totalAmount: invoice.grandTotal,
      paymentStatus: 'partial',
      paidAmount: roundedPaid,
      remainingAmount: roundedRemaining,
    });

    const result = await dispatch(
      updateInvoicePaymentStatusThunk({
        id: invoice.id,
        paymentStatus: 'partial',
        paidAmount: roundedPaid,
        remainingAmount: roundedRemaining,
      }),
    );

    if (updateInvoicePaymentStatusThunk.fulfilled.match(result) && result.payload) {
      setInvoice(result.payload);
      dispatch(
        showFeedback({
          type: 'success',
          title: isMarathi ? 'पेमेंट स्थिती अपडेट झाली' : 'Payment Status Updated',
          message: isMarathi
            ? `अ‍ॅडव्हान्स रक्कम ₹${roundedPaid.toLocaleString('en-IN')} अपडेट केली गेली.`
            : `Advance amount ₹${roundedPaid.toLocaleString('en-IN')} updated successfully.`,
        }),
      );
    }
  };

  const handleEditBill = () => {
    if (associatedBill) {
      dispatch(loadBillForEditing(associatedBill));
      dispatch(
        showFeedback({
          type: 'info',
          title: isMarathi ? 'कोटेशन संपादन' : 'Edit Quotation',
          message: isMarathi
            ? `कोटेशन #${associatedBill.billNumber} बिलिंग फॉर्ममध्ये लोड झाले आहे.`
            : `Quotation #${associatedBill.billNumber} loaded into Billing Form for editing.`,
          confirmText: isMarathi ? 'बिलिंगकडे जा' : 'Go to Billing',
          onConfirm: () => {
            navigation.navigate('BillingTab', {
              screen: 'CustomerInformation',
            });
          },
        }),
      );
    }
  };

  // Map items with parsed specs: prioritize invoice's own independent items
  const quotationItems =
    invoice.items && invoice.items.length > 0
      ? invoice.items.map(it => {
        let parsedSpecs: Record<string, any> = {};
        if (it.itemSpecs) {
          try {
            parsedSpecs = JSON.parse(it.itemSpecs);
          } catch { }
        }
        return {
          srNo: it.srNo,
          particularsMr: it.particularsMr || it.description,
          particularsEn: it.particularsEn || it.description,
          quantity: it.quantity,
          rate: it.rate,
          total: it.total,
          specs: parsedSpecs,
        };
      })
      : (associatedBill?.items || []).map(it => {
        let parsedSpecs: Record<string, any> = {};
        if (it.itemSpecs) {
          try {
            parsedSpecs = JSON.parse(it.itemSpecs);
          } catch { }
        }
        return {
          srNo: it.srNo,
          particularsMr: it.particularsMr,
          particularsEn: it.particularsEn,
          quantity: it.quantity,
          rate: it.rate,
          total: it.total,
          specs: parsedSpecs,
        };
      });

  const paidDisplay = typeof invoice.paidAmount === 'number'
    ? invoice.paidAmount
    : invoice.paymentStatus === 'paid'
      ? invoice.grandTotal
      : 0;

  const remainingDisplay = typeof invoice.remainingAmount === 'number'
    ? invoice.remainingAmount
    : invoice.paymentStatus === 'paid'
      ? 0
      : invoice.grandTotal;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={invoice.invoiceNumber}
        subtitle={`${isMarathi ? 'दिनांक' : 'Issued on'} ${invoice.date}`}
        showBack
        onBackPress={() => navigation.goBack()}
        rightElement={
          <View style={styles.headerRightControls}>
            {/* Edit Bill Action */}
            {associatedBill ? (
              <TouchableOpacity
                onPress={handleEditBill}
                style={styles.editBillBtn}>
                <Icon name="edit" size={14} color="#FFFFFF" />
                <Text style={styles.editBillText}>
                  {isMarathi ? 'संपादित करा' : 'Edit'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Payment Status Bar with Amount Tracking */}
        <View style={styles.statusBarCard}>
          <View style={styles.statusInfoRow}>
            <Text style={styles.statusLabel}>
              {isMarathi ? 'पेमेंट स्थिती :' : 'Payment Status :'}
            </Text>
            <Badge
              label={
                invoice.paymentStatus === 'paid'
                  ? isMarathi ? 'पूर्ण जमा' : 'PAID'
                  : invoice.paymentStatus === 'partial'
                    ? isMarathi ? 'अ‍ॅडव्हान्स' : 'ADVANCE'
                    : isMarathi ? 'देणे बाकी' : 'NOT PAID'
              }
              variant={
                invoice.paymentStatus === 'paid'
                  ? 'success'
                  : invoice.paymentStatus === 'partial'
                    ? 'warning'
                    : 'danger'
              }
            />
          </View>

          {/* Quick status toggle chips */}
          <View style={styles.statusChipsRow}>
            {(['pending', 'partial', 'paid'] as const).map(st => {
              const isActive =
                (showAdvanceInput && st === 'partial') ||
                (!showAdvanceInput && invoice.paymentStatus === st);
              return (
                <TouchableOpacity
                  key={st}
                  onPress={() => handleStatusChange(st)}
                  style={[
                    styles.statusChip,
                    isActive && styles.statusChipActive,
                  ]}>
                  <Text
                    style={[
                      styles.statusChipText,
                      isActive && styles.statusChipTextActive,
                    ]}>
                    {st === 'pending'
                      ? isMarathi ? 'देणे बाकी' : 'Not Paid'
                      : st === 'partial'
                        ? isMarathi ? 'अ‍ॅडव्हान्स' : 'Advance'
                        : isMarathi ? 'पूर्ण जमा' : 'Paid'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Advance Amount Input Section if Advance is selected */}
          {showAdvanceInput && (
            <View style={styles.advanceInputCard}>
              <Text style={styles.advanceInputLabel}>
                {isMarathi
                  ? 'अ‍ॅडव्हान्स / जमा रक्कम प्रविष्ट करा (₹):'
                  : 'Enter Advance / Paid Amount (₹):'}
              </Text>
              <View style={styles.advanceInputRow}>
                <TextInput
                  style={styles.advanceTextInput}
                  keyboardType="numeric"
                  value={advanceInput}
                  onChangeText={setAdvanceInput}
                  placeholder={isMarathi ? 'उदा. २००००' : 'e.g. 20000'}
                  placeholderTextColor="#A0988D"
                />
                <TouchableOpacity
                  style={styles.saveAdvanceBtn}
                  onPress={handleSaveAdvance}>
                  <Text style={styles.saveAdvanceBtnText}>
                    {isMarathi ? 'जतन करा' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Payment Amount Breakdown */}
          <View style={styles.paymentAmountsRow}>
            <View style={styles.paymentCol}>
              <Text style={styles.paymentColLabel}>
                {isMarathi ? 'जमा रक्कम' : 'Paid Amount'}
              </Text>
              <Text style={styles.paymentPaidText}>
                ₹ {paidDisplay.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.paymentColDivider} />

            <View style={styles.paymentCol}>
              <Text style={styles.paymentColLabel}>
                {isMarathi ? 'उर्वरित बाकी' : 'Remaining Amount'}
              </Text>
              <Text
                style={[
                  styles.paymentRemainingText,
                  remainingDisplay > 0 && styles.remainingAlertText,
                ]}>
                ₹ {remainingDisplay.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* Official Tax Invoice Document View */}
        <QuotationDocumentView
          billNumber={invoice.invoiceNumber}
          sourceQuotationNumber={
            invoice.sourceQuotationNumber ||
            associatedBill?.quotationNumber ||
            associatedBill?.billNumber
          }
          customerName={invoice.customerName}
          customerPhone={invoice.customerPhone || associatedBill?.customerPhone}
          customerAddress={invoice.customerAddress}
          date={invoice.date}
          borewellDepth={
            typeof invoice.borewellDepth === 'number' && invoice.borewellDepth > 0
              ? invoice.borewellDepth
              : associatedBill?.borewellDepth || 0
          }
          waterBearing={
            typeof invoice.waterBearing === 'number' && invoice.waterBearing > 0
              ? invoice.waterBearing
              : associatedBill?.waterBearing || 0
          }
          boreSize={
            typeof invoice.boreSize === 'number' && invoice.boreSize > 0
              ? invoice.boreSize
              : associatedBill?.boreSize || 0
          }
          items={quotationItems}
          grandTotal={invoice.grandTotal}
          amountInWords={
            isMarathi
              ? invoice.amountInWordsMarathi || invoice.amountInWords || associatedBill?.amountInWordsMarathi || associatedBill?.amountInWords
              : invoice.amountInWordsEnglish || invoice.amountInWords || associatedBill?.amountInWordsEnglish || associatedBill?.amountInWords
          }
          deliveryDays={invoice.deliveryDays || associatedBill?.deliveryDays || 7}
          language={language}
          invoiceNumber={invoice.invoiceNumber}
          isQuotation={false}
          paymentStatus={invoice.paymentStatus}
          paidAmount={paidDisplay}
          remainingAmount={remainingDisplay}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F4EC',
  },
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7A1C1C',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    ...shadows.sm,
  },
  editBillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 3,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  statusBarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  statusInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#332A24',
  },
  statusChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusChip: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 5,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: '#D4C6AB',
    backgroundColor: '#F9F6F0',
    alignItems: 'center',
  },
  statusChipActive: {
    backgroundColor: '#7A1C1C',
    borderColor: '#7A1C1C',
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#554B42',
  },
  statusChipTextActive: {
    color: '#FFFFFF',
  },
  paymentAmountsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF7F0',
    borderRadius: borderRadius.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
    borderWidth: 0.8,
    borderColor: '#D4C6AB',
  },
  paymentCol: {
    flex: 1,
    alignItems: 'center',
  },
  paymentColLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#554B42',
    marginBottom: 2,
  },
  paymentPaidText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2F855A',
  },
  paymentRemainingText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#332A24',
  },
  remainingAlertText: {
    color: '#C53030',
  },
  paymentColDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#D4C6AB',
    marginHorizontal: spacing.xs,
  },
  advanceInputCard: {
    marginTop: spacing.xs,
    backgroundColor: '#FAF7F0',
    padding: spacing.xs,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: '#D4C6AB',
  },
  advanceInputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#554B42',
    marginBottom: 4,
  },
  advanceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  advanceTextInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4C6AB',
    borderRadius: borderRadius.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#332A24',
    height: 36,
  },
  saveAdvanceBtn: {
    marginLeft: spacing.xs,
    backgroundColor: '#7A1C1C',
    paddingHorizontal: spacing.sm,
    height: 36,
    borderRadius: borderRadius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveAdvanceBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
