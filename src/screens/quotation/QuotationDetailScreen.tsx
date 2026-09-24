import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { Header } from '../../components/common/Header';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  updateQuotationStatusThunk,
  deleteQuotationThunk,
  fetchQuotationsThunk,
} from '../../redux/slices/quotationSlice';
import { loadBillForEditing } from '../../redux/slices/billingSlice';
import { showFeedback } from '../../redux/slices/feedbackSlice';
import { QuotationEntity, QuotationStatus } from '../../types/database';
import { QuotationDocumentView } from '../../components/quotation/QuotationDocumentView';
import { QuotationRepository } from '../../database/repositories/QuotationRepository';
import { InvoiceRepository } from '../../database/repositories/InvoiceRepository';
import { QuotationPdfService } from '../../services/QuotationPdfService';

export const QuotationDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const isMarathi = useAppSelector(state => state.language.currentLanguage === 'mr');
  const initialQuotation: QuotationEntity | undefined = route.params?.quotation;
  const targetQuotationId: string =
    route.params?.quotation?.id || route.params?.quotationId || '';
  const [quotation, setQuotation] = useState<QuotationEntity | null>(
    initialQuotation || null,
  );
  const [convertedInvoice, setConvertedInvoice] = useState<any>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [savedPdfUri, setSavedPdfUri] = useState<string | null>(null);
  const [savedPdfFileName, setSavedPdfFileName] = useState<string>('');

  const handleBack = () => {
    console.log('[QUOTATION][DETAIL][BACK]', {
      quotationId: targetQuotationId,
    });
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('QuotationList');
    }
  };

  useEffect(() => {
    const handleHardwareBack = () => {
      handleBack();
      return true;
    };
    const backSubscription = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => backSubscription.remove();
  }, [navigation, targetQuotationId]);

  useEffect(() => {
    setSavedPdfUri(null);
    setSavedPdfFileName('');

    if (!targetQuotationId) return;

    if (route.params?.quotation) {
      setQuotation(route.params.quotation);
    }

    console.log('[QUOTATION][DETAIL][OPEN]', {
      quotationId: targetQuotationId,
    });

    // Refresh quotation from database to ensure fresh status and items
    QuotationRepository.getQuotationById(targetQuotationId).then(fresh => {
      if (fresh) {
        setQuotation(fresh);
      }
    });

    // Check if quotation already has an associated invoice
    InvoiceRepository.getInvoiceBySourceQuotationId(targetQuotationId).then(inv => {
      if (inv) {
        setConvertedInvoice(inv);
      }
    });
  }, [targetQuotationId, route.params?.quotation]);

  // Check if PDF already exists in Downloads for this quotation (handles app restart)
  useEffect(() => {
    const qNum = quotation?.quotationNumber || quotation?.billNumber;
    if (!qNum) return;

    QuotationPdfService.findExistingPdf(qNum).then(existing => {
      if (existing && existing.exists && existing.uri) {
        setSavedPdfUri(existing.uri);
        if (existing.fileName) {
          setSavedPdfFileName(existing.fileName);
        }
        console.log('[QUOTATION][PDF][SAVED]', {
          source: 'EXISTING_DOWNLOADS',
          uri: existing.uri,
          fileName: existing.fileName,
        });
      }
    });
  }, [quotation?.quotationNumber, quotation?.billNumber]);

  const handleStatusChange = async (newStatus: QuotationStatus) => {
    if (!quotation || quotation.status === newStatus) return;
    const result = await dispatch(
      updateQuotationStatusThunk({ id: quotation.id, status: newStatus }),
    );
    if (updateQuotationStatusThunk.fulfilled.match(result) && result.payload) {
      setQuotation(result.payload);
      dispatch(
        showFeedback({
          type: 'success',
          title: isMarathi ? 'स्थिती अपडेट झाली' : 'Status Updated',
          message: isMarathi
            ? `कोटेशन स्थिती "${getStatusLabel(newStatus)}" मध्ये बदलली.`
            : `Quotation status changed to "${getStatusLabel(newStatus)}".`,
        }),
      );
    }
  };

  const handleEdit = () => {
    if (!quotation) return;
    dispatch(loadBillForEditing(quotation));
    navigation.navigate('BillingTab', { screen: 'CustomerInformation' });
  };

  const handleDelete = () => {
    if (!quotation) return;
    dispatch(
      showFeedback({
        type: 'confirmation',
        title: isMarathi ? 'कोटेशन हटवायचे?' : 'Delete Quotation?',
        message: isMarathi
          ? `कोटेशन #${qNumber} कायमचे काढून टाकायचे आहे का?`
          : `Permanently delete Quotation #${qNumber}?`,
        confirmText: isMarathi ? 'होय, हटवा' : 'Delete',
        cancelText: isMarathi ? 'रद्द करा' : 'Cancel',
        onConfirm: async () => {
          await dispatch(deleteQuotationThunk(quotation.id));
          dispatch(fetchQuotationsThunk());
          handleBack();
        },
      }),
    );
  };

  const handleGenerateInvoice = () => {
    if (!quotation) return;
    if (convertedInvoice || quotation.status === 'invoiced') {
      dispatch(
        showFeedback({
          type: 'info',
          title: isMarathi ? 'आधीच इनव्हॉइस तयार केले आहे' : 'Already Invoiced',
          message: isMarathi
            ? `या कोटेशनसाठी आधीच इनव्हॉइस #${convertedInvoice?.invoiceNumber || ''} तयार झाले आहे.`
            : `An invoice #${convertedInvoice?.invoiceNumber || ''} has already been created for this quotation.`,
          confirmText: isMarathi ? 'इनव्हॉइस पहा' : 'View Invoice',
          cancelText: isMarathi ? 'बंद करा' : 'Close',
          onConfirm: () => {
            if (convertedInvoice) {
              navigation.navigate('InvoiceTab', {
                screen: 'InvoiceDetail',
                params: { invoice: convertedInvoice },
              });
            }
          },
        }),
      );
      return;
    }

    // Open Final Invoice Adjustment Screen
    navigation.navigate('InvoiceTab', {
      screen: 'FinalInvoiceAdjustment',
      params: { quotation },
    });
  };

  const handleGeneratePdf = async () => {
    if (!quotation || isGeneratingPdf) return;
    const qNum = quotation.quotationNumber || quotation.billNumber || 'Q-001';

    console.log('[QUOTATION][PDF][CLICK]', {
      quotationId: quotation.id,
      quotationNumber: qNum,
    });

    setIsGeneratingPdf(true);
    try {
      const result = await QuotationPdfService.generateQuotationPdf(
        quotation,
        isMarathi ? 'mr' : 'en',
      );
      const finalTargetUri = result.uri || result.filePath;
      setSavedPdfUri(finalTargetUri);
      setSavedPdfFileName(result.fileName);
      dispatch(
        showFeedback({
          type: 'success',
          title: isMarathi ? 'PDF जतन झाली' : 'PDF Saved Successfully',
          message: isMarathi
            ? `कोटेशन PDF यशस्वीरित्या Downloads फोल्डरमध्ये जतन झाली:\n${result.fileName}`
            : `Quotation PDF saved successfully in Downloads folder:\n${result.fileName}`,
          confirmText: isMarathi ? 'PDF पहा' : 'View PDF',
          cancelText: isMarathi ? 'ठीक आहे' : 'OK',
          onConfirm: () => {
            handleViewPdf(finalTargetUri);
          },
        }),
      );
    } catch (e: any) {
      console.error('[QUOTATION][PDF][ERROR]', {
        quotationId: quotation.id,
        error: e?.message || String(e),
      });
      dispatch(
        showFeedback({
          type: 'error',
          title: isMarathi ? 'त्रुटी' : 'Error',
          message:
            e?.message ||
            (isMarathi
              ? 'कोटेशन PDF तयार करता आली नाही. कृपया पुन्हा प्रयत्न करा.'
              : 'Unable to generate PDF. Please try again.'),
        }),
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleViewPdf = async (customUri?: string) => {
    const target = customUri || savedPdfUri;
    if (!target) return;
    console.log('[QUOTATION][PDF][VIEW]', { uri: target });
    try {
      await QuotationPdfService.openPdf(target);
    } catch (e: any) {
      console.error('[QUOTATION][PDF][ERROR]', {
        step: 'HANDLE_VIEW_PDF',
        error: e?.message || String(e),
      });
      dispatch(
        showFeedback({
          type: 'warning',
          title: isMarathi ? 'दर्शविणे शक्य नाही' : 'Viewer Unavailable',
          message:
            e?.message ||
            (isMarathi
              ? 'या डिव्हाइसवर कोणताही PDF व्ह्यूअर उपलब्ध नाही.'
              : 'No PDF viewer is available on this device.'),
        }),
      );
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'approved':
        return isMarathi ? 'मंजूर' : 'Approved';
      case 'invoiced':
        return isMarathi ? 'इनव्हॉइस झाले' : 'Converted';
      case 'completed':
        return isMarathi ? 'पूर्ण झाले' : 'Completed';
      case 'in_progress':
        return isMarathi ? 'काम चालू' : 'In Progress';
      case 'rejected':
        return isMarathi ? 'नाकारले' : 'Rejected';
      case 'sent':
        return isMarathi ? 'पाठवले' : 'Sent';
      case 'draft':
      default:
        return isMarathi ? 'ड्राफ्ट' : 'Draft';
    }
  };

  const statusChips: QuotationStatus[] = [
    'draft',
    'sent',
    'approved',
    'in_progress',
    'completed',
  ];

  if (!quotation) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header
          title={isMarathi ? 'कोटेशन तपशील' : 'Quotation Details'}
          showBack
          onBackPress={handleBack}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const qNumber = quotation.quotationNumber || quotation.billNumber || 'Q-001';

  const quotationItems =
    quotation.items?.map(it => ({
      srNo: it.srNo,
      particularsMr: it.particularsMr,
      particularsEn: it.particularsEn,
      quantity: it.quantity,
      rate: it.rate,
      total: it.total,
      specs: it.itemSpecs ? JSON.parse(it.itemSpecs) : {},
    })) || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={`${isMarathi ? 'कोटेशन' : 'Quotation'} ${qNumber}`}
        subtitle={`${isMarathi ? 'दिनांक' : 'Issued on'} ${quotation.date}`}
        showBack
        onBackPress={handleBack}
        rightElement={
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleEdit} style={styles.headerBtn}>
              <Icon name="edit" size={15} color="#FFFFFF" />
              <Text style={styles.headerBtnText}>{isMarathi ? 'संपादित करा' : 'Edit'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDelete}
              style={[styles.headerBtn, styles.deleteHeaderBtn]}>
              <Icon name="trash" size={15} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Quotation Status & Action Card */}
        <View style={styles.statusControlCard}>
          <View style={styles.statusTopRow}>
            <Text style={styles.statusTitleLabel}>
              {isMarathi ? 'कोटेशन स्थिती :' : 'Quotation Status :'}
            </Text>
            <Badge
              label={getStatusLabel(quotation.status)}
              variant={
                quotation.status === 'approved'
                  ? 'success'
                  : quotation.status === 'invoiced'
                    ? 'info'
                    : quotation.status === 'completed'
                      ? 'primary'
                      : quotation.status === 'in_progress'
                        ? 'warning'
                        : quotation.status === 'rejected'
                          ? 'danger'
                          : 'neutral'
              }
            />
          </View>

          {/* Quick status selector chips */}
          {quotation.status !== 'invoiced' ? (
            <View style={styles.chipsRow}>
              {statusChips.map(st => {
                const isActive = quotation.status === st;
                return (
                  <TouchableOpacity
                    key={st}
                    activeOpacity={0.7}
                    onPress={() => handleStatusChange(st)}
                    style={[styles.statusChip, isActive && styles.statusChipActive]}>
                    <Text
                      style={[
                        styles.statusChipText,
                        isActive && styles.statusChipTextActive,
                      ]}>
                      {getStatusLabel(st)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {/* Prominent Action Bar */}
          <View style={styles.actionBanner}>
            {/* Payment Summary Box */}
            <View style={styles.paymentSummaryBox}>
              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>
                  {isMarathi ? 'पेमेंट स्थिती :' : 'Payment Status :'}
                </Text>
                <Badge
                  label={
                    quotation.paymentStatus === 'paid'
                      ? isMarathi ? 'पूर्ण जमा' : 'Paid'
                      : quotation.paymentStatus === 'partial'
                        ? isMarathi ? 'अ‍ॅडव्हान्स' : 'Advance'
                        : isMarathi ? 'देणे बाकी' : 'Not Paid'
                  }
                  variant={
                    quotation.paymentStatus === 'paid'
                      ? 'success'
                      : quotation.paymentStatus === 'partial'
                        ? 'warning'
                        : 'danger'
                  }
                  size="sm"
                />
              </View>

              <View style={styles.paymentAmountRow}>
                <View style={styles.paymentAmountCol}>
                  <Text style={styles.amountSmallLabel}>
                    {isMarathi ? 'एकूण रक्कम' : 'Total Amount'}
                  </Text>
                  <Text style={styles.amountBoldText}>
                    ₹ {quotation.totalAmount.toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={styles.paymentAmountCol}>
                  <Text style={styles.amountSmallLabel}>
                    {isMarathi ? 'जमा रक्कम' : 'Paid Amount'}
                  </Text>
                  <Text style={[styles.amountBoldText, styles.paidColor]}>
                    ₹ {(typeof quotation.paidAmount === 'number'
                      ? quotation.paidAmount
                      : quotation.paymentStatus === 'paid'
                        ? quotation.totalAmount
                        : 0
                    ).toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={styles.paymentAmountCol}>
                  <Text style={styles.amountSmallLabel}>
                    {isMarathi ? 'बाकी रक्कम' : 'Remaining'}
                  </Text>
                  <Text
                    style={[
                      styles.amountBoldText,
                      (typeof quotation.remainingAmount === 'number'
                        ? quotation.remainingAmount
                        : quotation.paymentStatus === 'paid'
                          ? 0
                          : quotation.totalAmount
                      ) > 0 && styles.remainingAlertColor,
                    ]}>
                    ₹ {(typeof quotation.remainingAmount === 'number'
                      ? quotation.remainingAmount
                      : quotation.paymentStatus === 'paid'
                        ? 0
                        : quotation.totalAmount
                    ).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            </View>

            {quotation.status === 'invoiced' || convertedInvoice ? (
              <View style={styles.convertedInfoBox}>
                <View style={styles.convertedTextCol}>
                  <Text style={styles.convertedTitle}>
                    ✓ {isMarathi ? 'अंतिम इनव्हॉइस तयार केले आहे' : 'Converted to Invoice'}
                  </Text>
                  <Text style={styles.convertedSub}>
                    {isMarathi ? 'इनव्हॉइस #' : 'Invoice #'}{' '}
                    {convertedInvoice?.invoiceNumber || ''}
                  </Text>
                </View>
                {convertedInvoice ? (
                  <Button
                    title={isMarathi ? 'इनव्हॉइस पहा' : 'View Invoice'}
                    onPress={() =>
                      navigation.navigate('InvoiceTab', {
                        screen: 'InvoiceDetail',
                        params: { invoice: convertedInvoice },
                      })
                    }
                    size="sm"
                    variant="primary"
                    icon="eye"
                  />
                ) : null}
              </View>
            ) : (
              <Button
                title={isMarathi ? 'इनव्हॉइस तयार करा (Generate Invoice)' : 'Generate Invoice'}
                onPress={handleGenerateInvoice}
                size="md"
                variant="primary"
                icon="fileText"
                iconPosition="left"
                style={styles.generateInvoiceBtn}
              />
            )}
          </View>
        </View>

        {/* PDF Export & View Action Card */}
        <View style={styles.pdfCard}>
          <View style={styles.pdfHeaderRow}>
            <View style={styles.pdfTitleRow}>
              <Icon name="fileText" size={17} color={colors.primary} />
              <Text style={styles.pdfCardTitle}>
                {isMarathi ? 'कोटेशन PDF दस्तऐवज' : 'Quotation PDF Document'}
              </Text>
            </View>
            {savedPdfUri ? (
              <Badge
                label={isMarathi ? 'जतन झाले' : 'Saved'}
                variant="success"
                size="sm"
              />
            ) : null}
          </View>

          {savedPdfUri ? (
            <View style={styles.pdfSuccessBox}>
              <Text style={styles.pdfSuccessTitle}>
                ✓ {isMarathi ? 'PDF यशस्वीरित्या जतन झाली' : 'PDF saved successfully'}
              </Text>
              <Text style={styles.pdfSuccessSub} numberOfLines={1}>
                {isMarathi ? 'Downloads फोल्डरमध्ये जतन:' : 'Saved in Downloads:'} {savedPdfFileName}
              </Text>
              <View style={styles.pdfBtnRow}>
                <Button
                  title={isMarathi ? 'PDF पहा' : 'View PDF'}
                  onPress={() => handleViewPdf(savedPdfUri)}
                  size="sm"
                  variant="primary"
                  icon="eye"
                  style={styles.viewPdfBtn}
                />
                <Button
                  title={
                    isGeneratingPdf
                      ? isMarathi ? 'तयार होत आहे...' : 'Generating...'
                      : isMarathi ? 'पुन्हा तयार करा' : 'Generate PDF'
                  }
                  onPress={handleGeneratePdf}
                  size="sm"
                  variant="secondary"
                  disabled={isGeneratingPdf}
                />
              </View>
            </View>
          ) : (
            <Button
              title={
                isGeneratingPdf
                  ? isMarathi ? 'PDF तयार होत आहे...' : 'Generating PDF...'
                  : isMarathi ? 'कोटेशन PDF तयार करा' : 'Generate PDF'
              }
              onPress={handleGeneratePdf}
              size="md"
              variant="primary"
              icon={isGeneratingPdf ? undefined : 'download'}
              disabled={isGeneratingPdf}
              style={styles.generatePdfBtn}
            />
          )}
        </View>

        {/* Official Quotation Document View */}
        <QuotationDocumentView
          billNumber={qNumber}
          customerName={quotation.customerName}
          customerPhone={quotation.customerPhone}
          customerAddress={quotation.customerAddress}
          date={quotation.date}
          borewellDepth={quotation.borewellDepth}
          waterBearing={quotation.waterBearing}
          boreSize={quotation.boreSize}
          vehicleNumber={quotation.vehicleNumber || quotation.vehicle}
          vehicleType={quotation.vehicleType}
          vehicleDetails={quotation.vehicleDetails}
          vehicle={quotation.vehicle}
          items={quotationItems}
          grandTotal={quotation.totalAmount}
          amountInWords={
            isMarathi
              ? quotation.amountInWordsMarathi || quotation.amountInWords
              : quotation.amountInWordsEnglish || quotation.amountInWords
          }
          deliveryDays={quotation.deliveryDays}
          language={isMarathi ? 'mr' : 'en'}
          isQuotation={true}
          paymentStatus={quotation.paymentStatus || 'pending'}
          paidAmount={
            typeof quotation.paidAmount === 'number'
              ? quotation.paidAmount
              : quotation.paymentStatus === 'paid'
                ? quotation.totalAmount
                : 0
          }
          remainingAmount={
            typeof quotation.remainingAmount === 'number'
              ? quotation.remainingAmount
              : quotation.paymentStatus === 'paid'
                ? 0
                : quotation.totalAmount
          }
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
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
    ...shadows.sm,
  },
  deleteHeaderBtn: {
    backgroundColor: colors.danger,
    paddingHorizontal: 8,
  },
  headerBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 3,
  },
  statusControlCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#E2D7C3',
    ...shadows.sm,
  },
  statusTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statusTitleLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: borderRadius.xs,
    backgroundColor: '#FAF7F0',
    borderWidth: 1,
    borderColor: '#D4C6AB',
    marginRight: 6,
    marginBottom: 6,
  },
  statusChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  statusChipTextActive: {
    color: '#FFFFFF',
  },
  actionBanner: {
    borderTopWidth: 1,
    borderTopColor: '#F0EAD6',
    paddingTop: spacing.xs,
  },
  generateInvoiceBtn: {
    width: '100%',
  },
  convertedInfoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EDFDF5',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  convertedTextCol: {
    flex: 1,
  },
  convertedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  convertedSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    fontWeight: '600',
  },
  paymentSummaryBox: {
    backgroundColor: '#FAF7F0',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#D4C6AB',
    marginBottom: spacing.xs,
  },
  paymentSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  paymentSummaryLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#332A24',
  },
  paymentAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E8DFD0',
    paddingTop: 6,
  },
  paymentAmountCol: {
    flex: 1,
    alignItems: 'center',
  },
  amountSmallLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#554B42',
    marginBottom: 1,
  },
  amountBoldText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1A1412',
  },
  paidColor: {
    color: '#2F855A',
  },
  remainingAlertColor: {
    color: '#C53030',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#E2D7C3',
    ...shadows.sm,
  },
  pdfHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  pdfTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pdfCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  pdfSuccessBox: {
    backgroundColor: '#EDFDF5',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  pdfSuccessTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#065F46',
  },
  pdfSuccessSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  pdfBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    marginTop: 4,
  },
  viewPdfBtn: {
    flex: 1,
  },
  generatePdfBtn: {
    width: '100%',
  },
});
