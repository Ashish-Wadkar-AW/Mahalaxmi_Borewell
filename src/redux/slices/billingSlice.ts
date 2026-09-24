import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  BillEntity,
  BillItemEntity,
  InvoiceEntity,
  QuotationEntity,
  QuotationItemEntity,
  QuotationStatus,
} from '../../types/database';
import { BillRepository } from '../../database/repositories/BillRepository';
import { QuotationRepository } from '../../database/repositories/QuotationRepository';
import { CalculationService } from '../../services/CalculationService';
import { formatParticularsText, numberToWordsMarathi } from '../../utils/quotationFormatters';
import {
  AppLanguage,
  setLanguage as setGlobalLanguage,
  setLanguageThunk,
  loadStoredLanguageThunk,
} from './languageSlice';

export type BillingLanguage = AppLanguage;

export interface BillingDraftItem {
  id: string;
  srNo: number;
  particularsMr: string;
  particularsEn: string;
  quantity: string;
  rate: string;
  total: number;
  specs: Record<string, any>;
}

export const DEFAULT_BILLING_ROWS: BillingDraftItem[] = [
  {
    id: 'row_1',
    srNo: 1,
    particularsMr: 'सबमर्सिबल पंपसेट सिकॉन, चॅम्पियन, जलसन (Make, Inch, H.P., Stage, Phase)',
    particularsEn: 'Submersible Pumpset Secon, Champion, Jalsan (Make, Inch, H.P., Stage, Phase)',
    quantity: '1',
    rate: '',
    total: 0,
    specs: { make: 'Secon', inch: '2', hp: '5', stage: '8', phase: '3' },
  },
  {
    id: 'row_2',
    srNo: 2,
    particularsMr: 'ओपनवेल / मोनोब्लॉक पंपसेट',
    particularsEn: 'Openwell / Monoblock Pumpset',
    quantity: '',
    rate: '',
    total: 0,
    specs: { row2Make: '', row2Hp: '', row2Phase: '', row2Type: 'openwell' },
  },
  {
    id: 'row_3',
    srNo: 3,
    particularsMr: 'सबमर्सिबल केबल (ISI मार्क)',
    particularsEn: 'Submersible Cable (ISI Mark)',
    quantity: '',
    rate: '',
    total: 0,
    specs: { cableSqMm: '', cableIsiMark: 'ISI', cableCore: '3' },
  },
  {
    id: 'row_4',
    srNo: 4,
    particularsMr: 'नायलॉन वायर रोप',
    particularsEn: 'Nylon Wire Rope',
    quantity: '',
    rate: '',
    total: 0,
    specs: { nylonWireRopeMm: '' },
  },
  {
    id: 'row_5',
    srNo: 5,
    particularsMr: 'डिलिव्हरी पाईप (जी.आय. / एच.डी.पी.ई. / यु.पी.व्ही.सी.)',
    particularsEn: 'Delivery Pipe (G.I. / H.D.P.E. / U.P.V.C.)',
    quantity: '',
    rate: '',
    total: 0,
    specs: { deliveryPipeInch: '', deliveryPipeMaterial: 'H.D.P.E.' },
  },
  {
    id: 'row_6',
    srNo: 6,
    particularsMr: 'कंट्रोल पॅनल स्टार्टर, मेनस्वीच, वोल्ट मीटर, अॅमीटर, ऑटो स्वीच',
    particularsEn: 'Control Panel Starter, Main switch, Volt meter, Ammeter, Auto switch',
    quantity: '',
    rate: '',
    total: 0,
    specs: { controlPanelDetails: '' },
  },
  {
    id: 'row_7',
    srNo: 7,
    particularsMr: 'फिटींग सेट',
    particularsEn: 'Fitting Set',
    quantity: '',
    rate: '',
    total: 0,
    specs: { fittingSetDetails: '' },
  },
  {
    id: 'row_8',
    srNo: 8,
    particularsMr: 'फिटींग चार्जेस व वाहतूक',
    particularsEn: 'Fitting Charges & Transportation',
    quantity: '',
    rate: '',
    total: 0,
    specs: { fittingChargesDetails: '', transportationDetails: '' },
  },
  {
    id: 'row_9',
    srNo: 9,
    particularsMr: 'इतर खर्च',
    particularsEn: 'Other Expenses',
    quantity: '',
    rate: '',
    total: 0,
    specs: { otherExpensesDetails: '' },
  },
];

interface BillingState {
  language: BillingLanguage;
  billNumber: string;
  editingQuotationId: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  date: string;
  borewellDepth: string; // Feet
  waterBearing: string; // Inch
  boreSize: string; // Inch
  deliveryDays: string;
  items: BillingDraftItem[];
  amountInWords: string;
  isAmountInWordsCustom: boolean;
  grandTotal: number;
  paymentStatus: 'pending' | 'paid' | 'partial';
  paidAmount: string;
  remainingAmount: number;
  isSaving: boolean;
  lastSavedQuotation: QuotationEntity | null;
  lastSavedInvoice: InvoiceEntity | null;
  error: string | null;
}

const todayFormatted = new Date().toISOString().split('T')[0];

const initialState: BillingState = {
  language: 'mr',
  billNumber: 'Q-001',
  editingQuotationId: null,
  customerName: '',
  customerPhone: '',
  customerAddress: '',
  date: todayFormatted,
  borewellDepth: '',
  waterBearing: '',
  boreSize: '',
  deliveryDays: '7',
  items: JSON.parse(JSON.stringify(DEFAULT_BILLING_ROWS)),
  amountInWords: '',
  isAmountInWordsCustom: false,
  grandTotal: 0,
  paymentStatus: 'pending',
  paidAmount: '0',
  remainingAmount: 0,
  isSaving: false,
  lastSavedQuotation: null,
  lastSavedInvoice: null,
  error: null,
};

export const fetchNextBillNumberThunk = createAsyncThunk(
  'billing/fetchNextBillNumber',
  async () => {
    return QuotationRepository.getNextQuotationNumber();
  },
);

export const saveQuotationThunk = createAsyncThunk<
  { quotation: QuotationEntity },
  void,
  { state: { billing: BillingState }; rejectValue: string }
>(
  'billing/saveQuotation',
  async (_, { getState, rejectWithValue }) => {
    const state = getState().billing;

    if (!state.customerName.trim()) {
      return rejectWithValue(
        state.language === 'mr'
          ? 'कृपया ग्राहकाचे नांव प्रविष्ट करा.'
          : 'Please enter customer name.',
      );
    }

    // Prepare Bill items that have valid quantity or rate or at least 1 line item
    const validDraftItems = state.items.map(it => {
      const q = parseFloat(it.quantity) || 0;
      const r = parseFloat(it.rate) || 0;
      const lineTotal = CalculationService.calculateLineTotal(q, r);
      return {
        ...it,
        qtyNum: q,
        rateNum: r,
        totalNum: lineTotal,
      };
    });

    const calculatedTotal = CalculationService.calculateGrandTotal(
      validDraftItems.map(it => ({ quantity: it.qtyNum, rate: it.rateNum })),
    );

    if (calculatedTotal <= 0) {
      return rejectWithValue(
        state.language === 'mr'
          ? 'कृपया किमान एका वस्तूचे वैध प्रमाण व दर प्रविष्ट करा.'
          : 'Please enter valid quantity and rate for at least one item.',
      );
    }

    const billId =
      state.editingQuotationId ||
      'bill_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    let qNumber = state.billNumber;
    if (!qNumber || !qNumber.startsWith('Q-')) {
      qNumber = await QuotationRepository.getNextQuotationNumber();
    }

    const mrWords = numberToWordsMarathi(calculatedTotal);
    const enWords = CalculationService.numberToWordsIndian(calculatedTotal);

    const paidNum =
      state.paymentStatus === 'paid'
        ? calculatedTotal
        : state.paymentStatus === 'pending'
        ? 0
        : Math.round((Math.min(Math.max(0, parseFloat(state.paidAmount) || 0), calculatedTotal) + Number.EPSILON) * 100) / 100;

    const remainingNum =
      state.paymentStatus === 'paid'
        ? 0
        : state.paymentStatus === 'pending'
        ? calculatedTotal
        : Math.round((Math.max(0, calculatedTotal - paidNum) + Number.EPSILON) * 100) / 100;

    console.log('[PAYMENT][CALCULATION]', {
      totalAmount: calculatedTotal,
      paymentStatus: state.paymentStatus,
      paidAmount: paidNum,
      remainingAmount: remainingNum,
    });

    let existingStatus: QuotationStatus | 'saved' = 'draft';
    if (state.editingQuotationId) {
      try {
        const existingQ = await QuotationRepository.getQuotationById(state.editingQuotationId);
        if (existingQ && existingQ.status) {
          existingStatus = existingQ.status;
        }
      } catch {}
    }

    const quotationEntity: QuotationEntity = {
      id: billId,
      billNumber: qNumber,
      quotationNumber: qNumber,
      customerId: '',
      customerName: state.customerName.trim(),
      customerPhone: state.customerPhone.trim(),
      customerAddress: state.customerAddress.trim(),
      date: state.date,
      borewellDepth: parseFloat(state.borewellDepth) || 0,
      waterBearing: parseFloat(state.waterBearing) || 0,
      boreSize: parseFloat(state.boreSize) || 0,
      totalAmount: calculatedTotal,
      amountInWords: state.amountInWords || (state.language === 'mr' ? mrWords : enWords),
      amountInWordsMarathi: mrWords,
      amountInWordsEnglish: enWords,
      deliveryDays: parseInt(state.deliveryDays, 10) || 7,
      status: existingStatus,
      paymentStatus: state.paymentStatus,
      paidAmount: paidNum,
      remainingAmount: remainingNum,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const itemEntities: QuotationItemEntity[] = validDraftItems.map(it => {
      const formattedMr = formatParticularsText(it.srNo, it.specs, 'mr');
      const formattedEn = formatParticularsText(it.srNo, it.specs, 'en');

      return {
        id: 'item_' + Date.now() + '_' + it.srNo + '_' + Math.random().toString(36).substring(2, 5),
        billId,
        srNo: it.srNo,
        particularsMr: formattedMr.fullText,
        particularsEn: formattedEn.fullText,
        quantity: it.qtyNum,
        rate: it.rateNum,
        total: it.totalNum,
        itemSpecs: JSON.stringify(it.specs || {}),
        createdAt: new Date().toISOString(),
      };
    });

    try {
      const savedQuotation = await QuotationRepository.saveQuotation(
        quotationEntity,
        itemEntities,
      );
      return { quotation: savedQuotation };
    } catch (e: any) {
      return rejectWithValue(e.message || 'Failed to save quotation.');
    }
  },
  {
    condition: (_, { getState }) => {
      const state = getState().billing;
      if (state.isSaving) {
        // Prevent duplicate execution while another save is in flight
        return false;
      }
    },
  },
);

export const saveBillThunk = createAsyncThunk<
  { bill: BillEntity; invoice: InvoiceEntity },
  void,
  { state: { billing: BillingState }; rejectValue: string }
>(
  'billing/saveBill',
  async (_, { getState, rejectWithValue }) => {
    const state = getState().billing;

    if (!state.customerName.trim()) {
      return rejectWithValue(
        state.language === 'mr'
          ? 'कृपया ग्राहकाचे नांव प्रविष्ट करा.'
          : 'Please enter customer name.',
      );
    }

    const validDraftItems = state.items.map(it => {
      const q = parseFloat(it.quantity) || 0;
      const r = parseFloat(it.rate) || 0;
      const lineTotal = CalculationService.calculateLineTotal(q, r);
      return {
        ...it,
        qtyNum: q,
        rateNum: r,
        totalNum: lineTotal,
      };
    });

    const calculatedTotal = CalculationService.calculateGrandTotal(
      validDraftItems.map(it => ({ quantity: it.qtyNum, rate: it.rateNum })),
    );

    if (calculatedTotal <= 0) {
      return rejectWithValue(
        state.language === 'mr'
          ? 'कृपया किमान एका वस्तूचे वैध प्रमाण व दर प्रविष्ट करा.'
          : 'Please enter valid quantity and rate for at least one item.',
      );
    }

    const billId =
      state.editingQuotationId ||
      'bill_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    const mrWords = numberToWordsMarathi(calculatedTotal);
    const enWords = CalculationService.numberToWordsIndian(calculatedTotal);

    const paidNum =
      state.paymentStatus === 'paid'
        ? calculatedTotal
        : state.paymentStatus === 'pending'
        ? 0
        : Math.round((Math.min(Math.max(0, parseFloat(state.paidAmount) || 0), calculatedTotal) + Number.EPSILON) * 100) / 100;

    const remainingNum =
      state.paymentStatus === 'paid'
        ? 0
        : state.paymentStatus === 'pending'
        ? calculatedTotal
        : Math.round((Math.max(0, calculatedTotal - paidNum) + Number.EPSILON) * 100) / 100;

    console.log('[PAYMENT][CALCULATION]', {
      totalAmount: calculatedTotal,
      paymentStatus: state.paymentStatus,
      paidAmount: paidNum,
      remainingAmount: remainingNum,
    });

    const billEntity: BillEntity = {
      id: billId,
      billNumber: state.billNumber,
      customerId: '',
      customerName: state.customerName.trim(),
      customerPhone: state.customerPhone.trim(),
      customerAddress: state.customerAddress.trim(),
      date: state.date,
      borewellDepth: parseFloat(state.borewellDepth) || 0,
      waterBearing: parseFloat(state.waterBearing) || 0,
      boreSize: parseFloat(state.boreSize) || 0,
      totalAmount: calculatedTotal,
      amountInWords: state.amountInWords || (state.language === 'mr' ? mrWords : enWords),
      amountInWordsMarathi: mrWords,
      amountInWordsEnglish: enWords,
      deliveryDays: parseInt(state.deliveryDays, 10) || 7,
      status: 'invoiced',
      paymentStatus: state.paymentStatus,
      paidAmount: paidNum,
      remainingAmount: remainingNum,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const itemEntities: BillItemEntity[] = validDraftItems.map(it => {
      const formattedMr = formatParticularsText(it.srNo, it.specs, 'mr');
      const formattedEn = formatParticularsText(it.srNo, it.specs, 'en');

      return {
        id: 'item_' + Date.now() + '_' + it.srNo + '_' + Math.random().toString(36).substring(2, 5),
        billId,
        srNo: it.srNo,
        particularsMr: formattedMr.fullText,
        particularsEn: formattedEn.fullText,
        quantity: it.qtyNum,
        rate: it.rateNum,
        total: it.totalNum,
        itemSpecs: JSON.stringify(it.specs || {}),
        createdAt: new Date().toISOString(),
      };
    });

    try {
      const result = await BillRepository.saveBillWithInvoice(billEntity, itemEntities);
      return result;
    } catch (e: any) {
      return rejectWithValue(e.message || 'Failed to save bill and generate invoice.');
    }
  },
  {
    condition: (_, { getState }) => {
      const state = getState().billing;
      if (state.isSaving) {
        return false;
      }
    },
  },
);

export const billingSlice = createSlice({
  name: 'billing',
  initialState,
  reducers: {
    setLanguage: (state, action: PayloadAction<BillingLanguage>) => {
      state.language = action.payload;
      if (!state.isAmountInWordsCustom && state.grandTotal > 0) {
        state.amountInWords =
          state.language === 'mr'
            ? numberToWordsMarathi(state.grandTotal)
            : CalculationService.numberToWordsIndian(state.grandTotal);
      }
    },
    setCustomerName: (state, action: PayloadAction<string>) => {
      state.customerName = action.payload;
    },
    setCustomerPhone: (state, action: PayloadAction<string>) => {
      state.customerPhone = action.payload;
    },
    setCustomerAddress: (state, action: PayloadAction<string>) => {
      state.customerAddress = action.payload;
    },
    setDate: (state, action: PayloadAction<string>) => {
      state.date = action.payload;
    },
    setBorewellDepth: (state, action: PayloadAction<string>) => {
      state.borewellDepth = action.payload;
    },
    setWaterBearing: (state, action: PayloadAction<string>) => {
      state.waterBearing = action.payload;
    },
    setBoreSize: (state, action: PayloadAction<string>) => {
      state.boreSize = action.payload;
    },
    setDeliveryDays: (state, action: PayloadAction<string>) => {
      state.deliveryDays = action.payload;
    },
    setPaymentStatus: (
      state,
      action: PayloadAction<'pending' | 'paid' | 'partial'>,
    ) => {
      state.paymentStatus = action.payload;
      if (action.payload === 'paid') {
        state.paidAmount = state.grandTotal > 0 ? state.grandTotal.toString() : '0';
        state.remainingAmount = 0;
      } else if (action.payload === 'pending') {
        state.paidAmount = '0';
        state.remainingAmount = state.grandTotal;
      } else {
        // Advance / partial
        const currentPaid = parseFloat(state.paidAmount) || 0;
        if (currentPaid === 0 || currentPaid >= state.grandTotal) {
          state.paidAmount = '';
          state.remainingAmount = state.grandTotal;
        } else {
          state.remainingAmount = Math.round((Math.max(0, state.grandTotal - currentPaid) + Number.EPSILON) * 100) / 100;
        }
      }
    },
    setPaidAmount: (state, action: PayloadAction<string>) => {
      state.paidAmount = action.payload;
      const paidNum = parseFloat(action.payload) || 0;
      if (paidNum >= state.grandTotal) {
        state.remainingAmount = 0;
      } else {
        state.remainingAmount = Math.round((Math.max(0, state.grandTotal - Math.max(0, paidNum)) + Number.EPSILON) * 100) / 100;
      }
    },
    updateItemSpecs: (
      state,
      action: PayloadAction<{ index: number; specs: Record<string, any> }>,
    ) => {
      const { index, specs } = action.payload;
      if (state.items[index]) {
        state.items[index].specs = {
          ...state.items[index].specs,
          ...specs,
        };
      }
    },
    updateItemQuantity: (
      state,
      action: PayloadAction<{ index: number; quantity: string }>,
    ) => {
      const item = state.items[action.payload.index];
      if (item) {
        item.quantity = action.payload.quantity;
        const q = parseFloat(item.quantity) || 0;
        const r = parseFloat(item.rate) || 0;
        item.total = CalculationService.calculateLineTotal(q, r);

        // Recalculate grand total
        state.grandTotal = CalculationService.calculateGrandTotal(
          state.items.map(it => ({
            quantity: parseFloat(it.quantity) || 0,
            rate: parseFloat(it.rate) || 0,
          })),
        );

        if (!state.isAmountInWordsCustom) {
          state.amountInWords =
            state.language === 'mr'
              ? numberToWordsMarathi(state.grandTotal)
              : CalculationService.numberToWordsIndian(state.grandTotal);
        }

        // Adjust payment remaining/paid
        if (state.paymentStatus === 'paid') {
          state.paidAmount = state.grandTotal.toString();
          state.remainingAmount = 0;
        } else if (state.paymentStatus === 'pending') {
          state.paidAmount = '0';
          state.remainingAmount = state.grandTotal;
        } else {
          const p = parseFloat(state.paidAmount) || 0;
          state.remainingAmount = Math.round((Math.max(0, state.grandTotal - Math.max(0, p)) + Number.EPSILON) * 100) / 100;
        }
      }
    },
    updateItemRate: (
      state,
      action: PayloadAction<{ index: number; rate: string }>,
    ) => {
      const item = state.items[action.payload.index];
      if (item) {
        item.rate = action.payload.rate;
        const q = parseFloat(item.quantity) || 0;
        const r = parseFloat(item.rate) || 0;
        item.total = CalculationService.calculateLineTotal(q, r);

        state.grandTotal = CalculationService.calculateGrandTotal(
          state.items.map(it => ({
            quantity: parseFloat(it.quantity) || 0,
            rate: parseFloat(it.rate) || 0,
          })),
        );

        if (!state.isAmountInWordsCustom) {
          state.amountInWords =
            state.language === 'mr'
              ? numberToWordsMarathi(state.grandTotal)
              : CalculationService.numberToWordsIndian(state.grandTotal);
        }

        // Adjust payment remaining/paid
        if (state.paymentStatus === 'paid') {
          state.paidAmount = state.grandTotal.toString();
          state.remainingAmount = 0;
        } else if (state.paymentStatus === 'pending') {
          state.paidAmount = '0';
          state.remainingAmount = state.grandTotal;
        } else {
          const p = parseFloat(state.paidAmount) || 0;
          state.remainingAmount = Math.round((Math.max(0, state.grandTotal - Math.max(0, p)) + Number.EPSILON) * 100) / 100;
        }
      }
    },
    setAmountInWords: (state, action: PayloadAction<string>) => {
      state.amountInWords = action.payload;
      state.isAmountInWordsCustom = true;
    },
    loadBillForEditing: (state, action: PayloadAction<BillEntity>) => {
      const bill = action.payload;
      state.editingQuotationId = bill.id;
      state.billNumber = bill.quotationNumber || bill.billNumber;
      state.customerName = bill.customerName;
      state.customerPhone = bill.customerPhone || '';
      state.customerAddress = bill.customerAddress;
      state.date = bill.date;
      state.borewellDepth = bill.borewellDepth ? bill.borewellDepth.toString() : '';
      state.waterBearing = bill.waterBearing ? bill.waterBearing.toString() : '';
      state.boreSize = bill.boreSize ? bill.boreSize.toString() : '';
      state.deliveryDays = bill.deliveryDays ? bill.deliveryDays.toString() : '7';
      state.amountInWords = bill.amountInWords || '';
      state.grandTotal = bill.totalAmount;
      state.isAmountInWordsCustom = true;

      const total = bill.totalAmount || 0;
      const isPaid = bill.paymentStatus === 'paid';
      state.paymentStatus = (bill.paymentStatus as any) || 'pending';
      state.paidAmount =
        typeof bill.paidAmount === 'number'
          ? bill.paidAmount.toString()
          : isPaid
          ? total.toString()
          : '0';
      state.remainingAmount =
        typeof bill.remainingAmount === 'number'
          ? bill.remainingAmount
          : isPaid
          ? 0
          : total;

      if (bill.items && bill.items.length > 0) {
        state.items = DEFAULT_BILLING_ROWS.map(defaultRow => {
          const matchingSaved = bill.items!.find(bi => bi.srNo === defaultRow.srNo);
          if (matchingSaved) {
            let parsedSpecs = defaultRow.specs;
            if (matchingSaved.itemSpecs) {
              try {
                parsedSpecs = { ...defaultRow.specs, ...JSON.parse(matchingSaved.itemSpecs) };
              } catch {}
            }
            return {
              ...defaultRow,
              quantity: matchingSaved.quantity > 0 ? matchingSaved.quantity.toString() : '',
              rate: matchingSaved.rate > 0 ? matchingSaved.rate.toString() : '',
              total: matchingSaved.total,
              specs: parsedSpecs,
            };
          }
          return defaultRow;
        });
      }
    },
    resetBillingForm: state => {
      state.editingQuotationId = null;
      state.customerName = '';
      state.customerPhone = '';
      state.customerAddress = '';
      state.borewellDepth = '';
      state.waterBearing = '';
      state.boreSize = '';
      state.deliveryDays = '7';
      state.items = JSON.parse(JSON.stringify(DEFAULT_BILLING_ROWS));
      state.grandTotal = 0;
      state.amountInWords = '';
      state.isAmountInWordsCustom = false;
      state.paymentStatus = 'pending';
      state.paidAmount = '0';
      state.remainingAmount = 0;
      state.lastSavedQuotation = null;
      state.lastSavedInvoice = null;
      state.isSaving = false;
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder.addCase(fetchNextBillNumberThunk.fulfilled, (state, action) => {
      state.billNumber = action.payload;
    });

    builder.addCase(saveQuotationThunk.pending, state => {
      state.isSaving = true;
      state.error = null;
    });
    builder.addCase(saveQuotationThunk.fulfilled, (state, action) => {
      state.isSaving = false;
      state.lastSavedQuotation = action.payload.quotation;
      state.error = null;
    });
    builder.addCase(saveQuotationThunk.rejected, (state, action) => {
      state.isSaving = false;
      state.error = (action.payload as string) || 'Failed to save quotation';
    });

    builder.addCase(saveBillThunk.pending, state => {
      state.isSaving = true;
      state.error = null;
    });
    builder.addCase(saveBillThunk.fulfilled, (state, action) => {
      state.isSaving = false;
      state.lastSavedInvoice = action.payload.invoice;
      state.error = null;
    });
    builder.addCase(saveBillThunk.rejected, (state, action) => {
      state.isSaving = false;
      state.error = (action.payload as string) || 'Failed to save bill';
    });
    builder.addCase(setGlobalLanguage, (state, action) => {
      state.language = action.payload;
      if (!state.isAmountInWordsCustom && state.grandTotal > 0) {
        state.amountInWords =
          action.payload === 'mr'
            ? numberToWordsMarathi(state.grandTotal)
            : CalculationService.numberToWordsIndian(state.grandTotal);
      }
    });
    builder.addCase(loadStoredLanguageThunk.fulfilled, (state, action) => {
      state.language = action.payload;
      if (!state.isAmountInWordsCustom && state.grandTotal > 0) {
        state.amountInWords =
          action.payload === 'mr'
            ? numberToWordsMarathi(state.grandTotal)
            : CalculationService.numberToWordsIndian(state.grandTotal);
      }
    });
    builder.addCase(setLanguageThunk.fulfilled, (state, action) => {
      state.language = action.payload;
      if (!state.isAmountInWordsCustom && state.grandTotal > 0) {
        state.amountInWords =
          action.payload === 'mr'
            ? numberToWordsMarathi(state.grandTotal)
            : CalculationService.numberToWordsIndian(state.grandTotal);
      }
    });
  },
});

export const {
  setLanguage,
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
  loadBillForEditing,
  resetBillingForm,
} = billingSlice.actions;

export default billingSlice.reducer;
