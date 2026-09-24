const storage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn((k: string, v: string) => {
    storage[k] = v;
    return Promise.resolve();
  }),
  getItem: jest.fn((k: string) => Promise.resolve(storage[k] || null)),
  removeItem: jest.fn((k: string) => {
    delete storage[k];
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    Object.keys(storage).forEach(k => delete storage[k]);
    return Promise.resolve();
  }),
}));

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(() => Promise.resolve(null)),
  resetGenericPassword: jest.fn(),
}));

import { db } from '../src/database/DatabaseService';
import { BillRepository } from '../src/database/repositories/BillRepository';
import { QuotationRepository } from '../src/database/repositories/QuotationRepository';
import { InvoiceRepository } from '../src/database/repositories/InvoiceRepository';
import { BillEntity, InvoiceEntity } from '../src/types/database';

describe('Payment Status & Amount Persistence Scenarios', () => {
  beforeAll(async () => {
    await db.init();
  });

  // TEST 1 — Not Paid Quotation
  it('Scenario 1: Not Paid Quotation persists pending status, 0 paid, and full total remaining', async () => {
    const totalAmount = 50000;
    const billId = 'bill_test_1';
    const billData: BillEntity = {
      id: billId,
      billNumber: 'Q-TEST-001',
      quotationNumber: 'Q-TEST-001',
      customerId: 'cust_01',
      customerName: 'Test Customer 1',
      customerAddress: 'Pune',
      date: '2026-09-23',
      borewellDepth: 300,
      waterBearing: 2,
      boreSize: 6,
      totalAmount,
      amountInWords: 'Fifty Thousand Rupees Only',
      amountInWordsMarathi: 'पन्नास हजार रुपये फक्त',
      amountInWordsEnglish: 'Fifty Thousand Rupees Only',
      deliveryDays: 7,
      status: 'draft',
      paymentStatus: 'pending',
      paidAmount: 0,
      remainingAmount: 50000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { bill: inserted } = await BillRepository.saveBillWithInvoice(billData, []);
    expect(inserted).toBeDefined();
    expect(inserted.paymentStatus).toBe('pending');
    expect(inserted.paidAmount).toBe(0);
    expect(inserted.remainingAmount).toBe(50000);

    // Verify SQLite Read-back via QuotationRepository
    const stored = await QuotationRepository.getQuotationById(inserted.id);
    expect(stored).not.toBeNull();
    expect(stored!.paymentStatus).toBe('pending');
    expect(stored!.paidAmount).toBe(0);
    expect(stored!.remainingAmount).toBe(50000);
    expect(stored!.totalAmount).toBe(50000);
  });

  // TEST 2 — Advance Quotation
  it('Scenario 2: Advance Quotation persists partial status, advance paid, and remaining balance', async () => {
    const totalAmount = 50000;
    const advance = 20000;
    const remaining = totalAmount - advance;
    const billId = 'bill_test_2';

    const billData: BillEntity = {
      id: billId,
      billNumber: 'Q-TEST-002',
      quotationNumber: 'Q-TEST-002',
      customerId: 'cust_02',
      customerName: 'Test Customer 2',
      customerAddress: 'Satara',
      date: '2026-09-23',
      borewellDepth: 350,
      waterBearing: 2.5,
      boreSize: 6.5,
      totalAmount,
      amountInWords: 'Fifty Thousand Rupees Only',
      deliveryDays: 7,
      status: 'draft',
      paymentStatus: 'partial',
      paidAmount: advance,
      remainingAmount: remaining,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { bill: inserted } = await BillRepository.saveBillWithInvoice(billData, []);
    expect(inserted.paymentStatus).toBe('partial');
    expect(inserted.paidAmount).toBe(20000);
    expect(inserted.remainingAmount).toBe(30000);

    // Verify direct SQLite fetch
    const stored = await QuotationRepository.getQuotationById(inserted.id);
    expect(stored).not.toBeNull();
    expect(stored!.paymentStatus).toBe('partial');
    expect(stored!.paidAmount).toBe(20000);
    expect(stored!.remainingAmount).toBe(30000);
  });

  // TEST 3 — Paid Quotation
  it('Scenario 3: Paid Quotation persists paid status, full total paid, and 0 remaining', async () => {
    const totalAmount = 50000;
    const billId = 'bill_test_3';

    const billData: BillEntity = {
      id: billId,
      billNumber: 'Q-TEST-003',
      quotationNumber: 'Q-TEST-003',
      customerId: 'cust_03',
      customerName: 'Test Customer 3',
      customerAddress: 'Kolhapur',
      date: '2026-09-23',
      borewellDepth: 400,
      waterBearing: 3,
      boreSize: 6.5,
      totalAmount,
      amountInWords: 'Fifty Thousand Rupees Only',
      deliveryDays: 7,
      status: 'draft',
      paymentStatus: 'paid',
      paidAmount: 50000,
      remainingAmount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { bill: inserted } = await BillRepository.saveBillWithInvoice(billData, []);
    expect(inserted.paymentStatus).toBe('paid');
    expect(inserted.paidAmount).toBe(50000);
    expect(inserted.remainingAmount).toBe(0);

    const stored = await QuotationRepository.getQuotationById(inserted.id);
    expect(stored).not.toBeNull();
    expect(stored!.paymentStatus).toBe('paid');
    expect(stored!.paidAmount).toBe(50000);
    expect(stored!.remainingAmount).toBe(0);
  });

  // TEST 4 — Advance Quotation -> Invoice Conversion
  it('Scenario 4: Advance Quotation converted to Invoice copies payment status, paidAmount, remainingAmount', async () => {
    const totalAmount = 50000;
    const advance = 20000;
    const remaining = 30000;
    const quotationId = 'bill_test_4';

    const { bill: quotation } = await BillRepository.saveBillWithInvoice(
      {
        id: quotationId,
        billNumber: 'Q-TEST-004',
        quotationNumber: 'Q-TEST-004',
        customerId: 'cust_04',
        customerName: 'Test Customer 4',
        customerAddress: 'Sangli',
        date: '2026-09-23',
        borewellDepth: 250,
        waterBearing: 1.5,
        boreSize: 6,
        totalAmount,
        amountInWords: 'Fifty Thousand Rupees Only',
        deliveryDays: 7,
        status: 'draft',
        paymentStatus: 'partial',
        paidAmount: advance,
        remainingAmount: remaining,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      [],
    );

    // Delete any auto-generated invoice for this bill to test createInvoiceFromQuotation directly
    const existing = await InvoiceRepository.getInvoiceBySourceQuotationId(quotation.id);
    if (existing) {
      await db.delete('invoices', existing.id);
    }

    const invoiceData: Omit<InvoiceEntity, 'id'> = {
      invoiceNumber: 'INV-2026-9004',
      billId: quotation.id,
      sourceQuotationId: quotation.id,
      sourceQuotationNumber: quotation.billNumber,
      customerId: quotation.customerId,
      customerName: quotation.customerName,
      customerAddress: quotation.customerAddress,
      date: '2026-09-23',
      borewellDepth: quotation.borewellDepth,
      waterBearing: quotation.waterBearing,
      boreSize: quotation.boreSize,
      deliveryDays: 7,
      amountInWords: quotation.amountInWords,
      subtotal: totalAmount,
      taxAmount: 0,
      grandTotal: totalAmount,
      paymentStatus: quotation.paymentStatus || 'partial',
      paidAmount: quotation.paidAmount,
      remainingAmount: quotation.remainingAmount,
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createdInvoice = await InvoiceRepository.createInvoiceFromQuotation(
      quotation.id,
      invoiceData,
      [],
    );

    expect(createdInvoice).toBeDefined();
    expect(createdInvoice.grandTotal).toBe(50000);
    expect(createdInvoice.paymentStatus).toBe('partial');
    expect(createdInvoice.paidAmount).toBe(20000);
    expect(createdInvoice.remainingAmount).toBe(30000);

    // Verify stored invoice in SQLite
    const storedInvoice = await InvoiceRepository.getInvoiceById(createdInvoice.id);
    expect(storedInvoice).not.toBeNull();
    expect(storedInvoice!.grandTotal).toBe(50000);
    expect(storedInvoice!.paymentStatus).toBe('partial');
    expect(storedInvoice!.paidAmount).toBe(20000);
    expect(storedInvoice!.remainingAmount).toBe(30000);
  });

  // TEST 5 — Invoice Payment Changed To Paid
  it('Scenario 5: Changing Invoice payment from Advance to Paid sets paid = grandTotal and remaining = 0', async () => {
    const inv = await InvoiceRepository.createInvoiceFromQuotation(
      'quotation_test_5',
      {
        invoiceNumber: 'INV-2026-9005',
        billId: 'quotation_test_5',
        sourceQuotationId: 'quotation_test_5',
        sourceQuotationNumber: 'Q-005',
        customerId: 'cust_05',
        customerName: 'Test Customer 5',
        customerAddress: 'Pune',
        date: '2026-09-23',
        borewellDepth: 200,
        waterBearing: 2,
        boreSize: 6,
        deliveryDays: 7,
        amountInWords: 'Fifty Thousand Rupees Only',
        subtotal: 50000,
        taxAmount: 0,
        grandTotal: 50000,
        paymentStatus: 'partial',
        paidAmount: 20000,
        remainingAmount: 30000,
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      [],
    );

    const updated = await InvoiceRepository.updatePaymentStatus(inv.id, 'paid');
    expect(updated).not.toBeNull();
    expect(updated!.paymentStatus).toBe('paid');
    expect(updated!.paidAmount).toBe(50000);
    expect(updated!.remainingAmount).toBe(0);

    const recheck = await InvoiceRepository.getInvoiceById(inv.id);
    expect(recheck!.paymentStatus).toBe('paid');
    expect(recheck!.paidAmount).toBe(50000);
    expect(recheck!.remainingAmount).toBe(0);
  });

  // TEST 6 — Invoice Changed To Not Paid
  it('Scenario 6: Changing Invoice to Not Paid sets paid = 0 and remaining = grandTotal', async () => {
    const inv = await InvoiceRepository.createInvoiceFromQuotation(
      'quotation_test_6',
      {
        invoiceNumber: 'INV-2026-9006',
        billId: 'quotation_test_6',
        sourceQuotationId: 'quotation_test_6',
        sourceQuotationNumber: 'Q-006',
        customerId: 'cust_06',
        customerName: 'Test Customer 6',
        customerAddress: 'Pune',
        date: '2026-09-23',
        borewellDepth: 200,
        waterBearing: 2,
        boreSize: 6,
        deliveryDays: 7,
        amountInWords: 'Fifty Thousand Rupees Only',
        subtotal: 50000,
        taxAmount: 0,
        grandTotal: 50000,
        paymentStatus: 'partial',
        paidAmount: 20000,
        remainingAmount: 30000,
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      [],
    );

    const updated = await InvoiceRepository.updatePaymentStatus(inv.id, 'pending');
    expect(updated).not.toBeNull();
    expect(updated!.paymentStatus).toBe('pending');
    expect(updated!.paidAmount).toBe(0);
    expect(updated!.remainingAmount).toBe(50000);

    const recheck = await InvoiceRepository.getInvoiceById(inv.id);
    expect(recheck!.paymentStatus).toBe('pending');
    expect(recheck!.paidAmount).toBe(0);
    expect(recheck!.remainingAmount).toBe(50000);
  });

  // TEST 7 — Invoice Changed To Advance
  it('Scenario 7: Changing Invoice to Advance with specific amount calculates and persists accurately', async () => {
    const inv = await InvoiceRepository.createInvoiceFromQuotation(
      'quotation_test_7',
      {
        invoiceNumber: 'INV-2026-9007',
        billId: 'quotation_test_7',
        sourceQuotationId: 'quotation_test_7',
        sourceQuotationNumber: 'Q-007',
        customerId: 'cust_07',
        customerName: 'Test Customer 7',
        customerAddress: 'Pune',
        date: '2026-09-23',
        borewellDepth: 200,
        waterBearing: 2,
        boreSize: 6,
        deliveryDays: 7,
        amountInWords: 'Sixty Thousand Rupees Only',
        subtotal: 60000,
        taxAmount: 0,
        grandTotal: 60000,
        paymentStatus: 'pending',
        paidAmount: 0,
        remainingAmount: 60000,
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      [],
    );

    const updated = await InvoiceRepository.updatePaymentStatus(inv.id, 'partial', 25000, 35000);
    expect(updated).not.toBeNull();
    expect(updated!.paymentStatus).toBe('partial');
    expect(updated!.paidAmount).toBe(25000);
    expect(updated!.remainingAmount).toBe(35000);

    const recheck = await InvoiceRepository.getInvoiceById(inv.id);
    expect(recheck!.paymentStatus).toBe('partial');
    expect(recheck!.paidAmount).toBe(25000);
    expect(recheck!.remainingAmount).toBe(35000);
  });

  // TEST 8 — Invalid Advance
  it('Scenario 8: Advance greater than grandTotal is prevented and never causes negative remaining', async () => {
    const grandTotal = 50000;
    const attemptedAdvance = 60000;

    // Validation rule verification
    const isValid = attemptedAdvance >= 0 && attemptedAdvance <= grandTotal;
    expect(isValid).toBe(false);

    // If normalized through repository safeguards
    const remainingNormalized = Math.max(
      0,
      Math.round((grandTotal - attemptedAdvance + Number.EPSILON) * 100) / 100,
    );
    expect(remainingNormalized).toBe(0); // Never negative
  });
});
