import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { CalculationService } from '../../services/CalculationService';
import { formatParticularsText, numberToWordsMarathi } from '../../utils/quotationFormatters';
import officialStamp from '../../assets/official_stamp.png';
import authorizedSignature from '../../assets/authorized_signature.png';

export const QUOTATION_STAMP = officialStamp;
export const QUOTATION_SIGNATURE = authorizedSignature;

export interface QuotationViewItem {
  srNo: number;
  particularsMr?: string;
  particularsEn?: string;
  quantity: string | number;
  rate: string | number;
  total: number;
  specs?: Record<string, any>;
}

export interface QuotationDocumentViewProps {
  billNumber: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  date: string;
  borewellDepth?: string | number;
  waterBearing?: string | number;
  boreSize?: string | number;
  vehicleNumber?: string;
  vehicleType?: string;
  vehicleDetails?: string;
  vehicle?: string;
  items: QuotationViewItem[];
  grandTotal: number;
  amountInWords?: string;
  deliveryDays?: string | number;
  language?: 'mr' | 'en';
  invoiceNumber?: string;
  sourceQuotationNumber?: string;
  isQuotation?: boolean;
  paymentStatus?: string;
  paidAmount?: number;
  remainingAmount?: number;
}

export const QuotationDocumentView: React.FC<QuotationDocumentViewProps> = ({
  billNumber,
  customerName,
  customerPhone,
  customerAddress,
  date,
  borewellDepth = 0,
  waterBearing = 0,
  boreSize = 0,
  vehicleNumber,
  vehicleType,
  vehicleDetails,
  vehicle,
  items,
  grandTotal,
  amountInWords,
  deliveryDays = 7,
  language = 'mr',
  invoiceNumber,
  sourceQuotationNumber,
  isQuotation = !invoiceNumber,
  paymentStatus,
  paidAmount,
  remainingAmount,
}) => {
  const isMarathi = language === 'mr';
  const { rupees, paise } = CalculationService.splitRupeesAndPaise(grandTotal);

  const displayWords =
    amountInWords && amountInWords.trim().length > 0
      ? amountInWords
      : isMarathi
        ? numberToWordsMarathi(grandTotal)
        : CalculationService.numberToWordsIndian(grandTotal);

  return (
    <View style={styles.paperSheet}>
      {/* Sacred Verse */}
      <Text style={styles.sacredVerse}>
        {isMarathi ? '|| श्री जोतिर्लिंग प्रसन्न ||' : '|| Shri Jyotirling Prasann ||'}
      </Text>

      {/* Top Header */}
      <View style={styles.memoHeader}>
        <View style={styles.logoCol}>
          <Image
            source={require('../../assets/images/logoquotation.png')}
            style={styles.quotationLogo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.bannerCol}>
          <View style={styles.redBanner}>
            <Text style={styles.bannerMainTitle}>
              {isMarathi ? 'महालक्ष्मी बोरवेल' : 'Mahalaxmi Borewell'}
            </Text>
            <Text style={styles.bannerSubTitle}>
              {isMarathi ? 'इलेक्ट्रिकल्स ॲन्ड मेकॅनिकल्स' : 'Electricals & Mechanicals'}
            </Text>
          </View>

          <Text style={styles.addressText}>
            {isMarathi
              ? 'मु. पो. हणबरवाडी, ता. करवीर, जि. कोल्हापूर.'
              : 'At Post Hanbarwadi, Taluka Karveer, District Kolhapur.'}
          </Text>
          <Text style={styles.phoneText}>
            मो. 8379918585, 8329533649, 7498236650
          </Text>
        </View>
      </View>

      {/* Bill / Invoice Metadata */}
      <View style={styles.metadataSection}>
        <View style={styles.metaTopRow}>
          <View style={styles.billNumberRow}>
            <Text style={styles.billNumberLabel}>
              {isQuotation
                ? isMarathi
                  ? 'कोटेशन नं. :'
                  : 'Quotation No. :'
                : isMarathi
                  ? 'इनव्हॉइस नं. :'
                  : 'Invoice No. :'}
            </Text>
            <Text style={styles.billNumberValue}>
              {isQuotation ? billNumber || 'Q-001' : invoiceNumber || billNumber || 'INV-001'}
            </Text>
          </View>

          {!isQuotation && (sourceQuotationNumber || billNumber) ? (
            <View style={styles.invoiceNumberRow}>
              <Text style={styles.invoiceLabel}>
                {isMarathi ? 'संदर्भ कोटेशन : ' : 'Source Quotation: '}
              </Text>
              <Text style={styles.invoiceValue}>
                {sourceQuotationNumber || billNumber}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>{isMarathi ? 'नांव :' : 'Name :'}</Text>
          <View style={styles.fieldValueContainer}>
            <Text style={styles.fieldValueText}>
              {customerName ? customerName : '-'}
            </Text>
          </View>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>{isMarathi ? 'पत्ता :' : 'Address :'}</Text>
          <View style={styles.fieldValueContainer}>
            <Text style={styles.fieldValueText}>
              {customerAddress ? customerAddress : '-'}
            </Text>
          </View>
        </View>

        {customerPhone ? (
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{isMarathi ? 'फोन नंबर :' : 'Phone :'}</Text>
            <View style={styles.fieldValueContainer}>
              <Text style={styles.fieldValueText}>{customerPhone}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>{isMarathi ? 'दिनांक :' : 'Date :'}</Text>
          <View style={styles.fieldValueContainer}>
            <Text style={styles.fieldValueText}>{date ? date : '-'}</Text>
          </View>
        </View>

        {(vehicleNumber || vehicleDetails || vehicle || vehicleType) ? (
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{isMarathi ? 'गाडी / वाहन :' : 'Vehicle :'}</Text>
            <View style={styles.fieldValueContainer}>
              <Text style={styles.fieldValueText}>
                {[vehicleNumber || vehicle, vehicleType, vehicleDetails].filter(Boolean).join(' - ')}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* Borewell Technical Specifications Box */}
      <View style={styles.borewellSpecsBox}>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>
            {isMarathi ? '१. बोरवेलची खोली :' : '1. Borewell Depth :'}
          </Text>
          <Text style={styles.specValue}>{borewellDepth || '0'}</Text>
          <Text style={styles.specUnit}>{isMarathi ? 'फूट' : 'Feet'}</Text>
        </View>

        <View style={styles.specRow}>
          <Text style={styles.specLabel}>
            {isMarathi ? '२. बेअरला लागलेले पाणी :' : '2. Water struck at bearing :'}
          </Text>
          <Text style={styles.specValue}>{waterBearing || '0'}</Text>
          <Text style={styles.specUnit}>{isMarathi ? 'इंच' : 'Inch'}</Text>
        </View>

        <View style={styles.specRow}>
          <Text style={styles.specLabel}>
            {isMarathi ? '३. बोर साईज :' : '3. Bore Size :'}
          </Text>
          <Text style={styles.specValue}>{boreSize || '0'}</Text>
          <Text style={styles.specUnit}>{isMarathi ? 'इंच' : 'Inch'}</Text>
        </View>
      </View>

      {/* Document Section Title */}
      <View style={styles.quotationTitleContainer}>
        <Text style={styles.quotationTitle}>
          {isQuotation
            ? isMarathi ? 'कोटेशन' : 'QUOTATION'
            : isMarathi ? 'कोटेशन' : 'TAX INVOICE'}
        </Text>
      </View>

      {/* Quotation Table */}
      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.thText, styles.colSr]}>{isMarathi ? 'अ.नं' : 'Sr'}</Text>
          <Text style={[styles.thText, styles.colParticulars]}>
            {isMarathi ? 'तपशील' : 'Details / Particulars'}
          </Text>
          <Text style={[styles.thText, styles.colQty]}>{isMarathi ? 'नग' : 'Qty'}</Text>
          <Text style={[styles.thText, styles.colRate]}>{isMarathi ? 'दर (₹)' : 'Rate (₹)'}</Text>
          <Text style={[styles.thText, styles.colTotal]}>{isMarathi ? 'एकूण (₹)' : 'Total (₹)'}</Text>
        </View>

        {/* Table Rows */}
        {items.map((item, index) => {
          const formatted = formatParticularsText(item.srNo, item.specs || {}, language);
          const lineSplit = CalculationService.splitRupeesAndPaise(item.total);
          const hasRate = parseFloat(item.rate as string) > 0;
          const hasQty = parseFloat(item.quantity as string) > 0;

          return (
            <View
              key={`quotation_row_${item.srNo}_${index}`}
              style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
              <Text style={[styles.tdText, styles.colSr, styles.textCenter]}>
                {item.srNo}
              </Text>

              <View style={[styles.colParticulars, styles.particularsCell]}>
                <Text style={styles.particularsText}>{formatted.title}</Text>
                {formatted.specsSubtitle ? (
                  <Text style={styles.specsSubtitleText}>{formatted.specsSubtitle}</Text>
                ) : null}
              </View>

              <View style={[styles.colQty, styles.textCenterView]}>
                <Text style={styles.cellText}>{hasQty ? item.quantity : '-'}</Text>
              </View>

              <View style={[styles.colRate, styles.textRightView]}>
                <Text style={styles.cellText}>
                  {hasRate ? Number(item.rate).toLocaleString('en-IN') : '-'}
                </Text>
              </View>

              <View style={[styles.colTotal, styles.textRightView]}>
                <Text style={styles.totalCellRupees}>
                  {item.total > 0 ? (
                    <>
                      {lineSplit.rupees.toLocaleString('en-IN')}
                      <Text style={styles.totalCellPaise}>
                        .{lineSplit.paise.toString().padStart(2, '0')}
                      </Text>
                    </>
                  ) : (
                    '-'
                  )}
                </Text>
              </View>
            </View>
          );
        })}

        {/* Grand Total Row */}
        <View style={styles.tableTotalRow}>
          <Text style={[styles.grandTotalLabel, styles.colSrToRate]}>
            {isMarathi ? 'एकूण  :' : 'GRAND TOTAL :'}
          </Text>
          <View style={[styles.colTotal, styles.textRightView]}>
            <Text style={styles.grandTotalValue}>
              ₹ {rupees.toLocaleString('en-IN')}.{paise.toString().padStart(2, '0')}
            </Text>
          </View>
        </View>
      </View>

      {/* Amount in Words */}
      <View style={styles.wordsSection}>
        <Text style={styles.wordsLabel}>
          {isMarathi ? 'अक्षरी रुपये  :' : 'Amount in Words (Rupees) :'}
        </Text>
        <View style={styles.wordsValueBox}>
          <Text style={styles.wordsValueText}>{displayWords}</Text>
        </View>
      </View>

      {/* Delivery Days Notice */}
      <View style={styles.deliveryDaysRow}>
        <Text style={styles.deliveryDaysLabel}>
          {isMarathi ? 'मालाची डिलिव्हरी :' : 'Goods Delivery :'}
        </Text>
        <Text style={styles.deliveryDaysHighlight}>
          {deliveryDays || '7'} {isMarathi ? 'दिवसात मिळेल' : 'Days'}
        </Text>
      </View>

      {/* Payment Information Summary in Document */}
      <View style={styles.docPaymentBox}>
        <View style={styles.docPaymentCol}>
          <Text style={styles.docPaymentLabel}>
            {isMarathi ? 'पेमेंट स्थिती' : 'Payment Status'}
          </Text>
          <Text
            style={[
              styles.docPaymentValue,
              paymentStatus === 'paid'
                ? styles.docStatusPaid
                : paymentStatus === 'partial'
                  ? styles.docStatusAdvance
                  : styles.docStatusPending,
            ]}>
            {paymentStatus === 'paid'
              ? isMarathi ? 'पूर्ण जमा' : 'Paid'
              : paymentStatus === 'partial'
                ? isMarathi ? 'अ‍ॅडव्हान्स' : 'Advance'
                : isMarathi ? 'देणे बाकी' : 'Not Paid'}
          </Text>
        </View>

        <View style={styles.docPaymentCol}>
          <Text style={styles.docPaymentLabel}>
            {isMarathi ? 'जमा रक्कम' : 'Paid Amount'}
          </Text>
          <Text style={[styles.docPaymentValue, styles.docPaidColor]}>
            ₹ {Number(paidAmount ?? (paymentStatus === 'paid' ? grandTotal : 0)).toLocaleString('en-IN')}
          </Text>
        </View>

        <View style={styles.docPaymentCol}>
          <Text style={styles.docPaymentLabel}>
            {isMarathi ? 'उर्वरित बाकी' : 'Remaining'}
          </Text>
          <Text
            style={[
              styles.docPaymentValue,
              (remainingAmount ?? (paymentStatus === 'paid' ? 0 : grandTotal)) > 0
                ? styles.docRemainingAlert
                : styles.docPaidColor,
            ]}>
            ₹ {Number(remainingAmount ?? (paymentStatus === 'paid' ? 0 : grandTotal)).toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      {/* Terms and Conditions */}
      <View style={styles.termsBox}>
        <Text style={styles.termsHeader}>
          {isMarathi ? 'अटी व शर्ती :' : 'Terms & Conditions :'}
        </Text>

        <Text style={styles.termItem}>
          1. {isMarathi
            ? 'मालाची डिलिव्हरी साईटवरती पोहोच मिळेल.'
            : 'Goods delivery will be delivered directly at the site.'}
        </Text>

        <Text style={styles.termItem}>
          2. {isMarathi
            ? 'वरील किमती प्रचलित टॅक्ससह असून डिलिव्हरीच्या वेळी जे दर व टॅक्स असतील ते आकारले जातील.'
            : 'The above prices include applicable taxes; rates and taxes existing at the time of delivery will apply.'}
        </Text>

        <Text style={styles.termItem}>
          3. {isMarathi
            ? `मालाची डिलिव्हरी ${deliveryDays || '7'} दिवसात मिळेल.`
            : `Goods delivery will be completed in ${deliveryDays || '7'} days.`}
        </Text>

        <Text style={styles.termItem}>
          4. {isMarathi
            ? 'मटेरिअल डिलिव्हरी आधी पेमेंट पूर्ण करणेचे आहे.'
            : 'Full payment must be completed prior to material delivery.'}
        </Text>

        <Text style={styles.termItem}>
          5. {isMarathi
            ? 'बोर मध्ये अथवा बोरमध्ये पंप अडकल्यास, अडकलेला पंप काढून देण्याची जबाबदारी कंपनीवर राहणार नाही.'
            : "If the pump gets stuck in the borewell, removing the stuck pump will not be the company's responsibility."}
        </Text>

        <Text style={styles.termItem}>
          6. {isMarathi
            ? 'वरील कोटेशनमध्ये नमूद केलेल्या तपशीलापेक्षा (इस्टिमेटपेक्षा) जादा मटेरिअल लागल्यास पार्टीला ते रोखीने खरेदी करावे लागेल.'
            : 'If extra materials are required beyond the estimate provided in the quotation, the client must purchase them in cash.'}
        </Text>
      </View>

      {/* Signature & Stamp Section */}
      <View style={styles.signatureSection}>
        {/* Official Stamp */}
        <View style={styles.signatureStampBox}>
          <Image
            source={officialStamp}
            style={styles.stampImage}
            resizeMode="contain"
          />
        </View>

        {/* Authorized Signature */}
        <View style={styles.signatureCol}>
          <Text style={styles.signatoryCompany}>
            {isMarathi
              ? 'महालक्ष्मी बोरवेल्स् आणि पंप्स् करिता'
              : 'For Mahalaxmi Borewells & Pumps'}
          </Text>

          <Image
            source={authorizedSignature}
            style={styles.signatureImage}
            resizeMode="contain"
          />

          <Text style={styles.signatoryTitle}>
            {isMarathi ? 'स्वाक्षरी / Signature' : 'Authorized Signature'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  paperSheet: {
    backgroundColor: '#FAF7F0', // authentic cream/beige billing paper
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: '#7A1C1C', // deep maroon
    ...shadows.md,
    marginVertical: spacing.sm,
  },
  sacredVerse: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7A1C1C',
    textAlign: 'center',
    marginBottom: spacing.xs,
    letterSpacing: 0.8,
  },
  memoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#D9CEB8',
  },
  logoCol: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quotationLogo: {
    width: 95,
    height: 56,
  },
  bannerCol: {
    flex: 1,
    paddingLeft: spacing.xs,
  },
  redBanner: {
    backgroundColor: '#7A1C1C',
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  bannerMainTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  bannerSubTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F4E7D3',
    marginTop: 1,
  },
  addressText: {
    fontSize: 10,
    color: '#332A24',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 3,
  },
  phoneText: {
    fontSize: 10,
    color: '#7A1C1C',
    textAlign: 'center',
    fontWeight: '800',
    marginTop: 1,
  },
  metadataSection: {
    backgroundColor: '#F3EDE0',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
    borderWidth: 0.8,
    borderColor: '#D4C6AB',
  },
  metaTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  billNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billNumberLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7A1C1C',
    marginRight: 4,
  },
  billNumberValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1A1412',
  },
  invoiceNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invoiceLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7A1C1C',
  },
  invoiceValue: {
    fontSize: 11,
    fontWeight: '900',
    color: '#1A1412',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#332A24',
    width: 70,
  },
  fieldValueContainer: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#332A24',
    paddingBottom: 2,
  },
  fieldValueText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1412',
  },
  borewellSpecsBox: {
    backgroundColor: '#F9F4EB',
    borderWidth: 1,
    borderColor: '#7A1C1C',
    borderRadius: borderRadius.sm,
    padding: spacing.xs,
    marginVertical: spacing.xs,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  specLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#332A24',
    flex: 1,
  },
  specValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7A1C1C',
    minWidth: 40,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#7A1C1C',
    marginHorizontal: spacing.xs,
  },
  specUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: '#554B42',
    width: 35,
  },
  quotationTitleContainer: {
    alignItems: 'center',
    marginVertical: 4,
  },
  quotationTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#7A1C1C',
    textDecorationLine: 'underline',
    letterSpacing: 1,
  },
  table: {
    borderWidth: 1,
    borderColor: '#7A1C1C',
    borderRadius: borderRadius.xs,
    overflow: 'hidden',
    marginVertical: spacing.xs,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#7A1C1C',
    paddingVertical: 4,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  thText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  colSr: {
    width: 28,
  },
  colParticulars: {
    flex: 1,
    paddingHorizontal: 4,
  },
  colQty: {
    width: 38,
  },
  colRate: {
    width: 58,
  },
  colTotal: {
    width: 72,
  },
  colSrToRate: {
    flex: 1,
    textAlign: 'right',
    paddingRight: spacing.sm,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: '#D4C6AB',
    backgroundColor: '#FAF7F0',
  },
  tableRowAlt: {
    backgroundColor: '#F4ECE0',
  },
  tdText: {
    fontSize: 10,
    color: '#1A1412',
  },
  particularsCell: {
    justifyContent: 'center',
  },
  particularsText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1A1412',
    lineHeight: 14,
  },
  specsSubtitleText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#7A1C1C',
    marginTop: 1,
  },
  cellText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1A1412',
  },
  textCenter: {
    textAlign: 'center',
  },
  textCenterView: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textRightView: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 4,
  },
  totalCellRupees: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1A1412',
  },
  totalCellPaise: {
    fontSize: 9,
    fontWeight: '700',
    color: '#554B42',
  },
  tableTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0E6D2',
    paddingVertical: 5,
    paddingHorizontal: 2,
    borderTopWidth: 1.5,
    borderTopColor: '#7A1C1C',
  },
  grandTotalLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#7A1C1C',
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#7A1C1C',
  },
  wordsSection: {
    backgroundColor: '#F3EDE0',
    padding: spacing.xs,
    borderRadius: borderRadius.xs,
    marginVertical: spacing.xs,
    borderWidth: 0.6,
    borderColor: '#D4C6AB',
  },
  wordsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7A1C1C',
    marginBottom: 2,
  },
  wordsValueBox: {
    borderBottomWidth: 1,
    borderBottomColor: '#332A24',
    paddingBottom: 2,
  },
  wordsValueText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1412',
    fontStyle: 'italic',
  },
  deliveryDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  deliveryDaysLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#332A24',
    marginRight: 4,
  },
  deliveryDaysHighlight: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7A1C1C',
  },
  docPaymentBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F3EDE0',
    borderWidth: 0.8,
    borderColor: '#7A1C1C',
    borderRadius: borderRadius.xs,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    marginVertical: 4,
  },
  docPaymentCol: {
    alignItems: 'center',
    flex: 1,
  },
  docPaymentLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#554B42',
    marginBottom: 1,
  },
  docPaymentValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  docStatusPaid: {
    color: '#2F855A',
  },
  docStatusAdvance: {
    color: '#B7791F',
  },
  docStatusPending: {
    color: '#C53030',
  },
  docPaidColor: {
    color: '#2F855A',
  },
  docRemainingAlert: {
    color: '#C53030',
  },
  termsBox: {
    backgroundColor: '#F5EFE4',
    borderWidth: 0.6,
    borderColor: '#C7B89E',
    borderRadius: borderRadius.xs,
    padding: spacing.xs,
    marginTop: spacing.xs,
  },
  termsHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7A1C1C',
    marginBottom: 2,
  },
  termItem: {
    fontSize: 8.5,
    color: '#443A30',
    lineHeight: 12,
    marginBottom: 1.5,
    fontWeight: '500',
  },
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  signatureStampBox: {
    width: 90,
    height: 75,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9E8F7A',
    borderRadius: borderRadius.xs,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    backgroundColor: 'transparent',
  },
  stampImage: {
    width: 80,
    height: 68,
  },
  signatureCol: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  signatoryCompany: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#7A1C1C',
    marginBottom: 2,
  },
  signatureImage: {
    width: 130,
    height: 48,
    marginVertical: 1,
  },
  signatoryTitle: {
    fontSize: 8.5,
    color: '#554B42',
    fontWeight: '600',
  },
});
