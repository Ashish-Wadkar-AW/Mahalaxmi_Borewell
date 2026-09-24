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
import { BillEntity } from '../src/types/database';

describe('Quotation Save Popup & Navigation Flow Tests', () => {
  beforeAll(async () => {
    await db.init();
  });

  it('saves quotation with exact ID and quotation number for success popup', async () => {
    const billData: BillEntity = {
      id: 'bill_test_nav_01',
      billNumber: 'MBM-2026-0001',
      quotationNumber: 'MBM-2026-0001',
      customerId: 'cust_nav_01',
      customerName: 'Nav Test Customer',
      customerAddress: 'Pune',
      date: '2026-09-23',
      borewellDepth: 300,
      waterBearing: 2,
      boreSize: 6,
      totalAmount: 50000,
      amountInWords: 'Fifty Thousand Rupees Only',
      deliveryDays: 7,
      status: 'draft',
      paymentStatus: 'partial',
      paidAmount: 20000,
      remainingAmount: 30000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { bill: saved } = await BillRepository.saveBillWithInvoice(billData, []);
    expect(saved).toBeDefined();
    expect(saved.id).toBe('bill_test_nav_01');
    expect(saved.quotationNumber).toBe('MBM-2026-0001');

    // Verify SQLite Read-back
    const stored = await QuotationRepository.getQuotationById(saved.id);
    expect(stored).not.toBeNull();
    expect(stored!.id).toBe('bill_test_nav_01');
    expect(stored!.quotationNumber).toBe('MBM-2026-0001');
    expect(stored!.paymentStatus).toBe('partial');
    expect(stored!.paidAmount).toBe(20000);
    expect(stored!.remainingAmount).toBe(30000);
  });

  it('Quotation list loads latest SQLite data including newly saved quotation', async () => {
    const allQuotations = await QuotationRepository.getAllQuotations();
    expect(allQuotations.length).toBeGreaterThan(0);

    const found = allQuotations.find(q => q.id === 'bill_test_nav_01');
    expect(found).toBeDefined();
    expect(found!.customerName).toBe('Nav Test Customer');
    expect(found!.paidAmount).toBe(20000);
    expect(found!.remainingAmount).toBe(30000);
  });

  it('Quotation Detail can retrieve full record using quotationId alone', async () => {
    const fetched = await QuotationRepository.getQuotationById('bill_test_nav_01');
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe('bill_test_nav_01');
    expect(fetched!.quotationNumber).toBe('MBM-2026-0001');
    expect(fetched!.borewellDepth).toBe(300);
  });
});
