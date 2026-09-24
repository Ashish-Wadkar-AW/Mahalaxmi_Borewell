import React from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { Button } from '../../components/common/Button';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  updateItemSpecs,
  updateItemQuantity,
  updateItemRate,
} from '../../redux/slices/billingSlice';
import { BillingStepIndicator } from './components/BillingStepIndicator';
import { BillingStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<BillingStackParamList, 'MaterialDetails'>;

export const MaterialDetailsScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationProp>();

  const billing = useAppSelector(state => state.billing);
  const isMarathi = useAppSelector(state => state.language.currentLanguage === 'mr');

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

  const handleNext = () => {
    navigation.navigate('TotalDelivery');
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
        <BillingStepIndicator currentStep={3} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.formCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>
                {isMarathi ? '३. पंप व साहित्य तपशील' : '3. Material & Pump Details'}
              </Text>
            </View>

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
  subItemBox: {
    backgroundColor: '#FCFAF5',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  subItemHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7A1C1C',
    marginBottom: spacing.xs,
  },
  marginTopSm: {
    marginTop: spacing.md,
  },
  marginTopXs: {
    marginTop: spacing.xs,
  },
  multiFieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.xs,
  },
  gridFieldHalf: {
    width: '48%',
  },
  gridFieldThird: {
    width: '31%',
  },
  smallLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  smallInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.borderMedium,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 12,
    color: colors.textPrimary,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  priceCol: {
    flex: 1,
  },
  priceTotalCol: {
    flex: 1.2,
    alignItems: 'flex-end',
  },
  lineTotalValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#7A1C1C',
    paddingVertical: 5,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.xs,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.borderMedium,
  },
  typeChipActive: {
    backgroundColor: '#7A1C1C',
    borderColor: '#7A1C1C',
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  typeChipTextActive: {
    color: '#FFFFFF',
  },
  inputGroup: {
    marginBottom: spacing.xs,
  },
  matChipRow: {
    flexDirection: 'row',
    gap: 4,
  },
  matChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.borderMedium,
  },
  matChipActive: {
    backgroundColor: '#7A1C1C',
    borderColor: '#7A1C1C',
  },
  matChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  matChipTextActive: {
    color: '#FFFFFF',
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
