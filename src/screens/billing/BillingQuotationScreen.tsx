import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { Icon } from '../../components/common/Icon';
import { Button } from '../../components/common/Button';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  setCustomerName,
  setCustomerPhone,
  setCustomerAddress,
  setDate,
  setBorewellDepth,
  setWaterBearing,
  setBoreSize,
  setDeliveryDays,
  setPaymentStatus,
  setPaidAmount,
  updateItemSpecs,
  updateItemQuantity,
  updateItemRate,
  setAmountInWords,
  resetBillingForm,
  fetchNextBillNumberThunk,
  saveBillThunk,
} from '../../redux/slices/billingSlice';
import { showFeedback } from '../../redux/slices/feedbackSlice';
import { CalculationService } from '../../services/CalculationService';
import { useNavigation } from '@react-navigation/native';

export const BillingQuotationScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();

  const billing = useAppSelector(state => state.billing);
  const isMarathi = useAppSelector(state => (state as any).language?.currentLanguage === 'mr');

  const [nameError, setNameError] = useState('');
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    dispatch(fetchNextBillNumberThunk());
  }, [dispatch]);

  const handleSaveBill = async () => {
    if (isSubmittingRef.current || billing.isSaving) return;
    isSubmittingRef.current = true;

    try {
      setNameError('');
      if (!billing.customerName.trim()) {
        setNameError(
          isMarathi ? 'कृपया ग्राहकाचे नांव प्रविष्ट करा.' : 'Please enter customer name.',
        );
        dispatch(
          showFeedback({
            type: 'error',
            title: isMarathi ? 'माहिती आवश्यक' : 'Validation Error',
            message: isMarathi
              ? 'कृपया ग्राहकाचे पूर्ण नांव प्रविष्ट करा.'
              : 'Please enter customer full name.',
          }),
        );
        return;
      }

      if (billing.grandTotal <= 0) {
        dispatch(
          showFeedback({
            type: 'error',
            title: isMarathi ? 'किंमत आवश्यक' : 'Pricing Required',
            message: isMarathi
              ? 'कृपया किमान एका वस्तूचे वैध प्रमाण (Qty) व दर (Rate) प्रविष्ट करा.'
              : 'Please enter valid quantity and rate for at least one item.',
          }),
        );
        return;
      }

      const result = await dispatch(saveBillThunk());
      if (saveBillThunk.fulfilled.match(result)) {
        const generatedInvoice = result.payload.invoice;
        dispatch(
          showFeedback({
            type: 'success',
            title: isMarathi ? 'कोटेशन व बिल जतन झाले!' : 'Bill & Invoice Saved!',
            message: isMarathi
              ? `कोटेशन #${billing.billNumber} यशस्वीरित्या जतन झाले आणि इनव्हॉइस #${generatedInvoice.invoiceNumber} तयार झाले.`
              : `Quotation #${billing.billNumber} saved successfully and Invoice #${generatedInvoice.invoiceNumber} generated.`,
            confirmText: isMarathi ? 'इनव्हॉइस पहा' : 'View Invoice',
            cancelText: isMarathi ? 'बंद करा' : 'Close',
            onConfirm: () => {
              navigation.navigate('InvoicesTab', {
                screen: 'InvoiceDetail',
                params: { invoice: generatedInvoice },
              });
            },
          }),
        );
        dispatch(resetBillingForm());
        dispatch(fetchNextBillNumberThunk());
      } else if (saveBillThunk.rejected.match(result)) {
        if ((result as any).meta?.condition) {
          return;
        }
        dispatch(
          showFeedback({
            type: 'error',
            title: isMarathi ? 'त्रुटी' : 'Error',
            message:
              (result.payload as string) ||
              (isMarathi ? 'बिल जतन करता आले नाही.' : 'Unable to save bill.'),
          }),
        );
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const updateSpecsForSr = (srNo: number, specs: Record<string, any>) => {
    const idx = billing.items.findIndex(it => it.srNo === srNo);
    if (idx >= 0) {
      dispatch(updateItemSpecs({ index: idx, specs }));
    }
  };

  const getItemBySr = (srNo: number) => {
    const idx = billing.items.findIndex(it => it.srNo === srNo);
    return { item: billing.items[idx], index: idx };
  };

  const r1 = getItemBySr(1);
  const r2 = getItemBySr(2);
  const r3 = getItemBySr(3);
  const r4 = getItemBySr(4);
  const r5 = getItemBySr(5);
  const r6 = getItemBySr(6);
  const r7 = getItemBySr(7);
  const r8 = getItemBySr(8);
  const r9 = getItemBySr(9);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        {/* Top Control Bar */}
        <View style={styles.controlBar}>
          {/* Reset Form Button */}
          <TouchableOpacity
            onPress={() => {
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
            }}
            style={styles.resetBtn}>
            <Icon name="refresh" size={16} color={colors.primary} />
            <Text style={styles.resetBtnText}>{isMarathi ? 'नवीन' : 'Reset'}</Text>
          </TouchableOpacity>
        </View>

        {/* Structured 5-Section Data-Entry Form Only (No Preview) */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Top Form Header Banner */}
          <View style={styles.formTopBanner}>
            <Image
              source={require('../../assets/images/logoquotation.png')}
              style={styles.formTopLogo}
              resizeMode="contain"
            />
            <View style={styles.formTopInfo}>
              <Text style={styles.formTopTitle}>
                {isMarathi ? 'महालक्ष्मी बोरवेल कोटेशन फॉर्म' : 'Mahalaxmi Borewell Quotation Form'}
              </Text>
              <Text style={styles.formTopSub}>
                {isMarathi
                  ? 'सर्व तपशील अचूक भरा. जतन केल्यावर इनव्हॉइस तयार होईल.'
                  : 'Enter all details accurately. Saving will generate the complete invoice.'}
              </Text>
            </View>
          </View>

          {/* SECTION 1: Customer Information */}
          <View style={styles.formCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>
                {isMarathi ? '१. ग्राहक माहिती' : '1. Customer Information'}
              </Text>
              <View style={styles.billBadge}>
                <Text style={styles.billBadgeText}>
                  {isMarathi ? 'पावती नं: ' : 'Bill #: '}
                  {billing.billNumber}
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {isMarathi ? 'ग्राहकाचे पूर्ण नांव *' : 'Customer Full Name *'}
              </Text>
              <TextInput
                value={billing.customerName}
                onChangeText={text => dispatch(setCustomerName(text))}
                placeholder={isMarathi ? 'उदा. राहुल पाटील' : 'e.g. Rahul Patil'}
                placeholderTextColor={colors.gray400}
                style={[styles.textInput, !!nameError && styles.inputErrorBorder]}
              />
              {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {isMarathi ? 'मोबाईल / फोन नंबर' : 'Phone Number'}
              </Text>
              <TextInput
                value={billing.customerPhone}
                onChangeText={text => dispatch(setCustomerPhone(text))}
                placeholder={isMarathi ? 'उदा. 9876543210' : 'e.g. 9876543210'}
                keyboardType="phone-pad"
                placeholderTextColor={colors.gray400}
                style={styles.textInput}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {isMarathi ? 'पत्ता व गाव' : 'Address / Village'}
              </Text>
              <TextInput
                value={billing.customerAddress}
                onChangeText={text => dispatch(setCustomerAddress(text))}
                placeholder={isMarathi ? 'उदा. हणबरवाडी, ता. करवीर' : 'e.g. Hanbarwadi, Kolhapur'}
                placeholderTextColor={colors.gray400}
                style={styles.textInput}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {isMarathi ? 'दिनांक' : 'Date'}
              </Text>
              <TextInput
                value={billing.date}
                onChangeText={text => dispatch(setDate(text))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.gray400}
                style={styles.textInput}
              />
            </View>
          </View>

          {/* SECTION 2: Borewell Information */}
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>
              {isMarathi ? '२. बोरवेल माहिती' : '2. Borewell Information'}
            </Text>

            <View style={styles.threeColRow}>
              <View style={styles.colInput}>
                <Text style={styles.inputLabel}>
                  {isMarathi ? 'बोरवेल खोली (फूट)' : 'Borewell Depth (Feet)'}
                </Text>
                <TextInput
                  value={billing.borewellDepth}
                  onChangeText={text => dispatch(setBorewellDepth(text))}
                  placeholder="500"
                  keyboardType="numeric"
                  placeholderTextColor={colors.gray400}
                  style={styles.textInput}
                />
              </View>

              <View style={styles.colInput}>
                <Text style={styles.inputLabel}>
                  {isMarathi ? 'लागलेले पाणी (इंच)' : 'Water Struck (Inch)'}
                </Text>
                <TextInput
                  value={billing.waterBearing}
                  onChangeText={text => dispatch(setWaterBearing(text))}
                  placeholder="10"
                  keyboardType="numeric"
                  placeholderTextColor={colors.gray400}
                  style={styles.textInput}
                />
              </View>

              <View style={styles.colInput}>
                <Text style={styles.inputLabel}>
                  {isMarathi ? 'बोर साईज (इंच)' : 'Bore Size (Inch)'}
                </Text>
                <TextInput
                  value={billing.boreSize}
                  onChangeText={text => dispatch(setBoreSize(text))}
                  placeholder="6"
                  keyboardType="numeric"
                  placeholderTextColor={colors.gray400}
                  style={styles.textInput}
                />
              </View>
            </View>
          </View>

          {/* SECTION 3: Material & Pump Details */}
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>
              {isMarathi ? '३. पंप व साहित्य तपशील' : '3. Material & Pump Details'}
            </Text>

            {/* Row 1: Submersible Pumpset */}
            <View style={styles.subItemBox}>
              <Text style={styles.subItemHeading}>
                {isMarathi
                  ? 'अ.नं १ : सबमर्सिबल पंपसेट (सिकॉन, चॅम्पियन, जलसन)'
                  : 'Row 1 : Submersible Pumpset'}
              </Text>

              <View style={styles.multiFieldsGrid}>
                <View style={styles.gridFieldHalf}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'मेक (Make)' : 'Make'}</Text>
                  <TextInput
                    value={r1.item?.specs?.make || ''}
                    onChangeText={val => updateSpecsForSr(1, { make: val })}
                    placeholder="Secon"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.gridFieldHalf}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'इंची (Inch)' : 'Inch'}</Text>
                  <TextInput
                    value={r1.item?.specs?.inch || ''}
                    onChangeText={val => updateSpecsForSr(1, { inch: val })}
                    placeholder="2"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.gridFieldThird}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'हाँ.पाँ. (H.P.)' : 'H.P.'}</Text>
                  <TextInput
                    value={r1.item?.specs?.hp || ''}
                    onChangeText={val => updateSpecsForSr(1, { hp: val })}
                    placeholder="5"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.gridFieldThird}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'स्टेज (Stage)' : 'Stage'}</Text>
                  <TextInput
                    value={r1.item?.specs?.stage || ''}
                    onChangeText={val => updateSpecsForSr(1, { stage: val })}
                    placeholder="8"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.gridFieldThird}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'फेज (Phase)' : 'Phase'}</Text>
                  <TextInput
                    value={r1.item?.specs?.phase || ''}
                    onChangeText={val => updateSpecsForSr(1, { phase: val })}
                    placeholder="3"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>
              </View>

              <View style={styles.pricingRow}>
                <View style={styles.priceCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'नग (Qty)' : 'Quantity'}</Text>
                  <TextInput
                    value={r1.item?.quantity || ''}
                    onChangeText={q => dispatch(updateItemQuantity({ index: r1.index, quantity: q }))}
                    placeholder="1"
                    keyboardType="numeric"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.priceCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'दर (Rate ₹)' : 'Rate (₹)'}</Text>
                  <TextInput
                    value={r1.item?.rate || ''}
                    onChangeText={r => dispatch(updateItemRate({ index: r1.index, rate: r }))}
                    placeholder="25000"
                    keyboardType="numeric"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.priceTotalCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'एकूण (Total ₹)' : 'Total (₹)'}</Text>
                  <Text style={styles.lineTotalValue}>
                    ₹ {r1.item?.total ? r1.item.total.toLocaleString('en-IN') : '0.00'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Row 2: Openwell / Monoblock Pumpset */}
            <View style={[styles.subItemBox, styles.marginTopSm]}>
              <Text style={styles.subItemHeading}>
                {isMarathi
                  ? 'अ.नं २ : ओपनवेल / मोनोब्लॉक पंपसेट'
                  : 'Row 2 : Openwell / Monoblock Pumpset'}
              </Text>

              <View style={styles.typeSelectorRow}>
                <TouchableOpacity
                  onPress={() => updateSpecsForSr(2, { row2Type: 'openwell' })}
                  style={[
                    styles.typeChip,
                    r2.item?.specs?.row2Type !== 'monoblock' && styles.typeChipActive,
                  ]}>
                  <Text
                    style={[
                      styles.typeChipText,
                      r2.item?.specs?.row2Type !== 'monoblock' && styles.typeChipTextActive,
                    ]}>
                    {isMarathi ? 'ओपनवेल (Openwell)' : 'Openwell'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => updateSpecsForSr(2, { row2Type: 'monoblock' })}
                  style={[
                    styles.typeChip,
                    r2.item?.specs?.row2Type === 'monoblock' && styles.typeChipActive,
                  ]}>
                  <Text
                    style={[
                      styles.typeChipText,
                      r2.item?.specs?.row2Type === 'monoblock' && styles.typeChipTextActive,
                    ]}>
                    {isMarathi ? 'मोनोब्लॉक (Monoblock)' : 'Monoblock'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.multiFieldsGrid}>
                <View style={styles.gridFieldThird}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'मेक (Make)' : 'Make'}</Text>
                  <TextInput
                    value={r2.item?.specs?.row2Make || ''}
                    onChangeText={val => updateSpecsForSr(2, { row2Make: val })}
                    placeholder="Crompton"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.gridFieldThird}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'हाँ.पाँ. (H.P.)' : 'H.P.'}</Text>
                  <TextInput
                    value={r2.item?.specs?.row2Hp || ''}
                    onChangeText={val => updateSpecsForSr(2, { row2Hp: val })}
                    placeholder="3"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.gridFieldThird}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'फेज (Phase)' : 'Phase'}</Text>
                  <TextInput
                    value={r2.item?.specs?.row2Phase || ''}
                    onChangeText={val => updateSpecsForSr(2, { row2Phase: val })}
                    placeholder="Single"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>
              </View>

              <View style={styles.pricingRow}>
                <View style={styles.priceCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'नग (Qty)' : 'Quantity'}</Text>
                  <TextInput
                    value={r2.item?.quantity || ''}
                    onChangeText={q => dispatch(updateItemQuantity({ index: r2.index, quantity: q }))}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.priceCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'दर (Rate ₹)' : 'Rate (₹)'}</Text>
                  <TextInput
                    value={r2.item?.rate || ''}
                    onChangeText={r => dispatch(updateItemRate({ index: r2.index, rate: r }))}
                    placeholder="0.00"
                    keyboardType="numeric"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.priceTotalCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'एकूण (Total ₹)' : 'Total (₹)'}</Text>
                  <Text style={styles.lineTotalValue}>
                    ₹ {r2.item?.total ? r2.item.total.toLocaleString('en-IN') : '0.00'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Row 3: Submersible Cable */}
            <View style={[styles.subItemBox, styles.marginTopSm]}>
              <Text style={styles.subItemHeading}>
                {isMarathi ? 'अ.नं ३ : सबमर्सिबल केबल' : 'Row 3 : Submersible Cable'}
              </Text>

              <View style={styles.multiFieldsGrid}>
                <View style={styles.gridFieldThird}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'स्क्वे. एम.एम.' : 'Sq. mm.'}</Text>
                  <TextInput
                    value={r3.item?.specs?.cableSqMm || ''}
                    onChangeText={val => updateSpecsForSr(3, { cableSqMm: val })}
                    placeholder="4"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.gridFieldThird}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'ISI मार्क' : 'ISI Mark'}</Text>
                  <TextInput
                    value={r3.item?.specs?.cableIsiMark || 'ISI'}
                    onChangeText={val => updateSpecsForSr(3, { cableIsiMark: val })}
                    placeholder="ISI"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.gridFieldThird}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'कोर (Core)' : 'Core'}</Text>
                  <TextInput
                    value={r3.item?.specs?.cableCore || ''}
                    onChangeText={val => updateSpecsForSr(3, { cableCore: val })}
                    placeholder="3"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>
              </View>

              <View style={styles.pricingRow}>
                <View style={styles.priceCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'नग / मीटर' : 'Qty / Mtrs'}</Text>
                  <TextInput
                    value={r3.item?.quantity || ''}
                    onChangeText={q => dispatch(updateItemQuantity({ index: r3.index, quantity: q }))}
                    placeholder="150"
                    keyboardType="numeric"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.priceCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'दर (Rate ₹)' : 'Rate (₹)'}</Text>
                  <TextInput
                    value={r3.item?.rate || ''}
                    onChangeText={r => dispatch(updateItemRate({ index: r3.index, rate: r }))}
                    placeholder="120"
                    keyboardType="numeric"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.priceTotalCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'एकूण (Total ₹)' : 'Total (₹)'}</Text>
                  <Text style={styles.lineTotalValue}>
                    ₹ {r3.item?.total ? r3.item.total.toLocaleString('en-IN') : '0.00'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Row 4: Nylon Wire Rope */}
            <View style={[styles.subItemBox, styles.marginTopSm]}>
              <Text style={styles.subItemHeading}>
                {isMarathi ? 'अ.नं ४ : नायलॉन वायर रोप' : 'Row 4 : Nylon Wire Rope'}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.smallLabel}>{isMarathi ? 'माप (एम.एम.)' : 'Size (mm)'}</Text>
                <TextInput
                  value={r4.item?.specs?.nylonWireRopeMm || ''}
                  onChangeText={val => updateSpecsForSr(4, { nylonWireRopeMm: val })}
                  placeholder="6"
                  keyboardType="numeric"
                  placeholderTextColor={colors.gray400}
                  style={styles.smallInput}
                />
              </View>

              <View style={styles.pricingRow}>
                <View style={styles.priceCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'नग / मीटर' : 'Quantity'}</Text>
                  <TextInput
                    value={r4.item?.quantity || ''}
                    onChangeText={q => dispatch(updateItemQuantity({ index: r4.index, quantity: q }))}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.priceCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'दर (Rate ₹)' : 'Rate (₹)'}</Text>
                  <TextInput
                    value={r4.item?.rate || ''}
                    onChangeText={r => dispatch(updateItemRate({ index: r4.index, rate: r }))}
                    placeholder="0.00"
                    keyboardType="numeric"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.priceTotalCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'एकूण (Total ₹)' : 'Total (₹)'}</Text>
                  <Text style={styles.lineTotalValue}>
                    ₹ {r4.item?.total ? r4.item.total.toLocaleString('en-IN') : '0.00'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Row 5: Delivery Pipe */}
            <View style={[styles.subItemBox, styles.marginTopSm]}>
              <Text style={styles.subItemHeading}>
                {isMarathi ? 'अ.नं ५ : डिलिव्हरी पाईप' : 'Row 5 : Delivery Pipe'}
              </Text>

              <View style={styles.multiFieldsGrid}>
                <View style={styles.gridFieldHalf}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'इंची (Inch)' : 'Size (Inch)'}</Text>
                  <TextInput
                    value={r5.item?.specs?.deliveryPipeInch || ''}
                    onChangeText={val => updateSpecsForSr(5, { deliveryPipeInch: val })}
                    placeholder="2"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.gridFieldHalf}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'मटेरिअल प्रकार' : 'Material'}</Text>
                  <View style={styles.matChipRow}>
                    {(['H.D.P.E.', 'G.I.', 'U.P.V.C.'] as const).map(mat => (
                      <TouchableOpacity
                        key={mat}
                        onPress={() => updateSpecsForSr(5, { deliveryPipeMaterial: mat })}
                        style={[
                          styles.matChip,
                          r5.item?.specs?.deliveryPipeMaterial === mat && styles.matChipActive,
                        ]}>
                        <Text
                          style={[
                            styles.matChipText,
                            r5.item?.specs?.deliveryPipeMaterial === mat && styles.matChipTextActive,
                          ]}>
                          {mat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.pricingRow}>
                <View style={styles.priceCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'नग / फूट' : 'Quantity'}</Text>
                  <TextInput
                    value={r5.item?.quantity || ''}
                    onChangeText={q => dispatch(updateItemQuantity({ index: r5.index, quantity: q }))}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.priceCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'दर (Rate ₹)' : 'Rate (₹)'}</Text>
                  <TextInput
                    value={r5.item?.rate || ''}
                    onChangeText={r => dispatch(updateItemRate({ index: r5.index, rate: r }))}
                    placeholder="0.00"
                    keyboardType="numeric"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.priceTotalCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'एकूण (Total ₹)' : 'Total (₹)'}</Text>
                  <Text style={styles.lineTotalValue}>
                    ₹ {r5.item?.total ? r5.item.total.toLocaleString('en-IN') : '0.00'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Row 6: Control Panel */}
            <View style={[styles.subItemBox, styles.marginTopSm]}>
              <Text style={styles.subItemHeading}>
                {isMarathi ? 'अ.नं ६ : कंट्रोल पॅनल स्टार्टर' : 'Row 6 : Control Panel'}
              </Text>
              <TextInput
                value={r6.item?.specs?.controlPanelDetails || ''}
                onChangeText={val => updateSpecsForSr(6, { controlPanelDetails: val })}
                placeholder={
                  isMarathi
                    ? 'स्टार्टर, मेनस्वीच, वोल्ट मीटर, अॅमीटर, ऑटो स्वीच तपशील'
                    : 'Starter, main switch, volt meter, ammeter, auto switch details'
                }
                placeholderTextColor={colors.gray400}
                style={styles.smallInput}
              />

              <View style={styles.pricingRow}>
                <View style={styles.priceCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'नग' : 'Quantity'}</Text>
                  <TextInput
                    value={r6.item?.quantity || ''}
                    onChangeText={q => dispatch(updateItemQuantity({ index: r6.index, quantity: q }))}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.priceCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'दर (₹)' : 'Rate (₹)'}</Text>
                  <TextInput
                    value={r6.item?.rate || ''}
                    onChangeText={r => dispatch(updateItemRate({ index: r6.index, rate: r }))}
                    placeholder="0.00"
                    keyboardType="numeric"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.priceTotalCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'एकूण (₹)' : 'Total (₹)'}</Text>
                  <Text style={styles.lineTotalValue}>
                    ₹ {r6.item?.total ? r6.item.total.toLocaleString('en-IN') : '0.00'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Row 7: Fitting Set */}
            <View style={[styles.subItemBox, styles.marginTopSm]}>
              <Text style={styles.subItemHeading}>
                {isMarathi ? 'अ.नं ७ : फिटींग सेट' : 'Row 7 : Fitting Set'}
              </Text>
              <TextInput
                value={r7.item?.specs?.fittingSetDetails || ''}
                onChangeText={val => updateSpecsForSr(7, { fittingSetDetails: val })}
                placeholder={isMarathi ? 'फिटींग सेट तपशील' : 'Fitting set details'}
                placeholderTextColor={colors.gray400}
                style={styles.smallInput}
              />

              <View style={styles.pricingRow}>
                <View style={styles.priceCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'नग' : 'Quantity'}</Text>
                  <TextInput
                    value={r7.item?.quantity || ''}
                    onChangeText={q => dispatch(updateItemQuantity({ index: r7.index, quantity: q }))}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.priceCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'दर (₹)' : 'Rate (₹)'}</Text>
                  <TextInput
                    value={r7.item?.rate || ''}
                    onChangeText={r => dispatch(updateItemRate({ index: r7.index, rate: r }))}
                    placeholder="0.00"
                    keyboardType="numeric"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.priceTotalCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'एकूण (₹)' : 'Total (₹)'}</Text>
                  <Text style={styles.lineTotalValue}>
                    ₹ {r7.item?.total ? r7.item.total.toLocaleString('en-IN') : '0.00'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Row 8: Fitting Charges & Transportation */}
            <View style={[styles.subItemBox, styles.marginTopSm]}>
              <Text style={styles.subItemHeading}>
                {isMarathi ? 'अ.नं ८ : फिटींग चार्जेस व वाहतूक' : 'Row 8 : Fitting Charges & Transportation'}
              </Text>
              <TextInput
                value={r8.item?.specs?.fittingChargesDetails || ''}
                onChangeText={val => updateSpecsForSr(8, { fittingChargesDetails: val })}
                placeholder={isMarathi ? 'फिटींग चार्जेस तपशील' : 'Fitting charges details'}
                placeholderTextColor={colors.gray400}
                style={styles.smallInput}
              />
              <TextInput
                value={r8.item?.specs?.transportationDetails || ''}
                onChangeText={val => updateSpecsForSr(8, { transportationDetails: val })}
                placeholder={isMarathi ? 'वाहतूक तपशील' : 'Transportation details'}
                placeholderTextColor={colors.gray400}
                style={[styles.smallInput, styles.marginTopXs]}
              />

              <View style={styles.pricingRow}>
                <View style={styles.priceCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'नग' : 'Quantity'}</Text>
                  <TextInput
                    value={r8.item?.quantity || ''}
                    onChangeText={q => dispatch(updateItemQuantity({ index: r8.index, quantity: q }))}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.priceCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'दर (₹)' : 'Rate (₹)'}</Text>
                  <TextInput
                    value={r8.item?.rate || ''}
                    onChangeText={r => dispatch(updateItemRate({ index: r8.index, rate: r }))}
                    placeholder="0.00"
                    keyboardType="numeric"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.priceTotalCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'एकूण (₹)' : 'Total (₹)'}</Text>
                  <Text style={styles.lineTotalValue}>
                    ₹ {r8.item?.total ? r8.item.total.toLocaleString('en-IN') : '0.00'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Row 9: Other Expenses */}
            <View style={[styles.subItemBox, styles.marginTopSm]}>
              <Text style={styles.subItemHeading}>
                {isMarathi ? 'अ.नं ९ : इतर खर्च' : 'Row 9 : Other Expenses'}
              </Text>
              <TextInput
                value={r9.item?.specs?.otherExpensesDetails || ''}
                onChangeText={val => updateSpecsForSr(9, { otherExpensesDetails: val })}
                placeholder={isMarathi ? 'इतर खर्चाचा तपशील' : 'Other expense details'}
                placeholderTextColor={colors.gray400}
                style={styles.smallInput}
              />

              <View style={styles.pricingRow}>
                <View style={styles.priceCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'नग' : 'Quantity'}</Text>
                  <TextInput
                    value={r9.item?.quantity || ''}
                    onChangeText={q => dispatch(updateItemQuantity({ index: r9.index, quantity: q }))}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.priceCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'दर (₹)' : 'Rate (₹)'}</Text>
                  <TextInput
                    value={r9.item?.rate || ''}
                    onChangeText={r => dispatch(updateItemRate({ index: r9.index, rate: r }))}
                    placeholder="0.00"
                    keyboardType="numeric"
                    placeholderTextColor={colors.gray400}
                    style={styles.smallInput}
                  />
                </View>

                <View style={styles.priceTotalCol}>
                  <Text style={styles.smallLabel}>{isMarathi ? 'एकूण (₹)' : 'Total (₹)'}</Text>
                  <Text style={styles.lineTotalValue}>
                    ₹ {r9.item?.total ? r9.item.total.toLocaleString('en-IN') : '0.00'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* SECTION 4: Total & Delivery */}
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>
              {isMarathi ? '४. एकूण रक्कम व डिलिव्हरी' : '4. Total & Delivery'}
            </Text>

            {/* Grand Total Display */}
            <View style={styles.grandTotalHighlightBox}>
              <Text style={styles.grandTotalHighlightLabel}>
                {isMarathi ? 'एकूण रक्कम (Grand Total) :' : 'Grand Total Amount :'}
              </Text>
              <Text style={styles.grandTotalHighlightValue}>
                {CalculationService.formatIndianCurrency(billing.grandTotal)}
              </Text>
            </View>

            {/* Amount in Words */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {isMarathi ? 'अक्षरी रुपये (Amount in Words)' : 'Amount in Words (Rupees)'}
              </Text>
              <TextInput
                value={billing.amountInWords}
                onChangeText={text => dispatch(setAmountInWords(text))}
                placeholder={
                  isMarathi ? 'उदा. पंचवीस हजार रुपये फक्त' : 'e.g. Twenty Five Thousand Rupees Only'
                }
                placeholderTextColor={colors.gray400}
                style={[styles.textInput, styles.multilineInput]}
                multiline
              />
            </View>

            {/* Delivery Days */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {isMarathi ? 'मालाची डिलिव्हरी दिवस' : 'Delivery Days'}
              </Text>
              <View style={styles.rowAlign}>
                <TextInput
                  value={billing.deliveryDays}
                  onChangeText={text => dispatch(setDeliveryDays(text))}
                  placeholder="7"
                  keyboardType="numeric"
                  style={[styles.textInput, styles.shortNumericInput]}
                />
                <Text style={styles.daysUnitText}>
                  {isMarathi ? 'दिवसात मिळेल' : 'Days'}
                </Text>
              </View>
            </View>
          </View>

          {/* SECTION 5: Payment Information */}
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>
              {isMarathi ? '५. पेमेंट माहिती' : '5. Payment Information'}
            </Text>

            {/* Payment Choice Segmented Control */}
            <Text style={styles.inputLabel}>
              {isMarathi ? 'पेमेंट स्थिती निवडा (Payment Status)' : 'Select Payment Status'}
            </Text>
            <View style={styles.paymentStatusRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => dispatch(setPaymentStatus('pending'))}
                style={[
                  styles.paymentStatusBtn,
                  billing.paymentStatus === 'pending' && styles.paymentBtnPendingActive,
                ]}>
                <Icon
                  name="clock"
                  size={14}
                  color={billing.paymentStatus === 'pending' ? '#FFFFFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.paymentBtnText,
                    billing.paymentStatus === 'pending' && styles.paymentBtnTextActive,
                  ]}>
                  {isMarathi ? 'देणे बाकी' : 'Not Paid'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => dispatch(setPaymentStatus('paid'))}
                style={[
                  styles.paymentStatusBtn,
                  billing.paymentStatus === 'paid' && styles.paymentBtnPaidActive,
                ]}>
                <Icon
                  name="check"
                  size={14}
                  color={billing.paymentStatus === 'paid' ? '#FFFFFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.paymentBtnText,
                    billing.paymentStatus === 'paid' && styles.paymentBtnTextActive,
                  ]}>
                  {isMarathi ? 'पूर्ण जमा' : 'Paid'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => dispatch(setPaymentStatus('partial'))}
                style={[
                  styles.paymentStatusBtn,
                  billing.paymentStatus === 'partial' && styles.paymentBtnAdvanceActive,
                ]}>
                <Icon
                  name="rupee"
                  size={14}
                  color={billing.paymentStatus === 'partial' ? '#FFFFFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.paymentBtnText,
                    billing.paymentStatus === 'partial' && styles.paymentBtnTextActive,
                  ]}>
                  {isMarathi ? 'अॅडव्हान्स' : 'Advance'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Payment Amount Inputs & Automatic Summary */}
            {billing.paymentStatus === 'partial' ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {isMarathi ? 'अॅडव्हान्स / जमा रक्कम (₹) *' : 'Advance / Paid Amount (₹) *'}
                </Text>
                <TextInput
                  value={billing.paidAmount}
                  onChangeText={text => dispatch(setPaidAmount(text))}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor={colors.gray400}
                  style={styles.textInput}
                />
              </View>
            ) : null}

            {/* Financial Status Summary Box */}
            <View style={styles.paymentSummaryBox}>
              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>
                  {isMarathi ? 'पेमेंट स्थिती :' : 'Payment Status :'}
                </Text>
                <Text
                  style={[
                    styles.paymentSummaryStatusBadge,
                    billing.paymentStatus === 'paid'
                      ? styles.statusColorPaid
                      : billing.paymentStatus === 'partial'
                      ? styles.statusColorAdvance
                      : styles.statusColorPending,
                  ]}>
                  {billing.paymentStatus === 'paid'
                    ? isMarathi ? 'पूर्ण जमा (Paid)' : 'Paid'
                    : billing.paymentStatus === 'partial'
                    ? isMarathi ? 'अॅडव्हान्स (Advance)' : 'Advance'
                    : isMarathi ? 'देणे बाकी (Not Paid)' : 'Not Paid'}
                </Text>
              </View>

              <View style={styles.paymentSummaryDivider} />

              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>
                  {isMarathi ? 'जमा रक्कम (Paid Amount) :' : 'Paid Amount :'}
                </Text>
                <Text style={styles.paymentSummaryPaidVal}>
                  ₹ {(parseFloat(billing.paidAmount) || 0).toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryLabel}>
                  {isMarathi ? 'उर्वरित बाकी रक्कम (Remaining) :' : 'Remaining Amount :'}
                </Text>
                <Text
                  style={[
                    styles.paymentSummaryRemainingVal,
                    billing.remainingAmount > 0 && styles.remainingAlertColor,
                  ]}>
                  ₹ {billing.remainingAmount.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          </View>

          {/* Save & Generate Invoice Action Button */}
          <Button
            title={
              billing.isSaving
                ? isMarathi ? 'जतन करत आहे...' : 'Saving...'
                : isMarathi ? 'बिल जतन करा व इनव्हॉइस बनवा' : 'Save Bill & Generate Invoice'
            }
            onPress={handleSaveBill}
            loading={billing.isSaving}
            disabled={billing.isSaving}
            icon="check"
            size="lg"
            style={styles.saveSubmitBtn}
          />
        </ScrollView>
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
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    ...shadows.sm,
  },
  languageToggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfacePaper,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    overflow: 'hidden',
  },
  langButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  langButtonActive: {
    backgroundColor: colors.primary,
  },
  langButtonInactive: {
    backgroundColor: 'transparent',
  },
  langButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  langButtonTextActive: {
    color: colors.textLight,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
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
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  formTopBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: '#7A1C1C',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  formTopLogo: {
    width: 60,
    height: 38,
  },
  formTopInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  formTopTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#7A1C1C',
  },
  formTopSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#7A1C1C',
    marginBottom: spacing.sm,
  },
  billBadge: {
    backgroundColor: '#FAF7F0',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#7A1C1C',
  },
  billBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7A1C1C',
  },
  inputGroup: {
    marginBottom: spacing.sm,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
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
  inputErrorBorder: {
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 2,
  },
  multilineInput: {
    minHeight: 50,
    textAlignVertical: 'top',
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shortNumericInput: {
    width: 80,
    textAlign: 'center',
  },
  daysUnitText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  threeColRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  colInput: {
    flex: 1,
  },
  subItemBox: {
    backgroundColor: '#FAF7F0',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  subItemHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  multiFieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  gridFieldHalf: {
    width: '48%',
  },
  gridFieldThird: {
    width: '31%',
  },
  smallLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  smallInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.borderMedium,
    borderRadius: borderRadius.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    fontSize: 12,
    color: colors.textPrimary,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  priceCol: {
    width: '30%',
  },
  priceTotalCol: {
    width: '34%',
    alignItems: 'flex-end',
  },
  lineTotalValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 4,
  },
  marginTopXs: {
    marginTop: spacing.xs,
  },
  marginTopSm: {
    marginTop: spacing.sm,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  typeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.borderMedium,
  },
  typeChipActive: {
    backgroundColor: '#7A1C1C',
    borderColor: '#7A1C1C',
  },
  typeChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  typeChipTextActive: {
    color: '#FFFFFF',
  },
  matChipRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  matChip: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.borderMedium,
  },
  matChipActive: {
    backgroundColor: '#7A1C1C',
    borderColor: '#7A1C1C',
  },
  matChipText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  matChipTextActive: {
    color: '#FFFFFF',
  },
  grandTotalHighlightBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF7F0',
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    borderColor: '#7A1C1C',
    marginBottom: spacing.sm,
  },
  grandTotalHighlightLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#7A1C1C',
  },
  grandTotalHighlightValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#7A1C1C',
  },
  paymentStatusRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  paymentStatusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    backgroundColor: '#FAF7F0',
    borderWidth: 1.5,
    borderColor: colors.borderMedium,
  },
  paymentBtnPendingActive: {
    backgroundColor: '#C53030',
    borderColor: '#9B2C2C',
  },
  paymentBtnPaidActive: {
    backgroundColor: '#2F855A',
    borderColor: '#22543D',
  },
  paymentBtnAdvanceActive: {
    backgroundColor: '#D69E2E',
    borderColor: '#B7791F',
  },
  paymentBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  paymentBtnTextActive: {
    color: '#FFFFFF',
  },
  paymentSummaryBox: {
    backgroundColor: '#FAF7F0',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    marginTop: spacing.xs,
  },
  paymentSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  paymentSummaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  paymentSummaryStatusBadge: {
    fontSize: 12,
    fontWeight: '800',
  },
  statusColorPaid: {
    color: '#2F855A',
  },
  statusColorAdvance: {
    color: '#B7791F',
  },
  statusColorPending: {
    color: '#C53030',
  },
  paymentSummaryDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 4,
  },
  paymentSummaryPaidVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2F855A',
  },
  paymentSummaryRemainingVal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  remainingAlertColor: {
    color: '#C53030',
  },
  saveSubmitBtn: {
    marginVertical: spacing.md,
  },
});
