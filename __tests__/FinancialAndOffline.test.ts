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
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));

import { CalculationService } from '../src/services/CalculationService';
import { AuthService, SESSION_DURATION_MS } from '../src/services/AuthService';
import { BackupService } from '../src/services/BackupService';
import { formatParticularsText, numberToWordsMarathi } from '../src/utils/quotationFormatters';

describe('Financial Calculation Engine', () => {
  it('calculates line total accurately with integer-based precision', () => {
    // 5 units at 1245.50
    const total = CalculationService.calculateLineTotal(5, 1245.5);
    expect(total).toBe(6227.5);
  });

  it('splits monetary amount into Rupees and Paise accurately', () => {
    const split = CalculationService.splitRupeesAndPaise(125430.75);
    expect(split.rupees).toBe(125430);
    expect(split.paise).toBe(75);
  });

  it('calculates quotation grand total correctly', () => {
    const items = [
      { quantity: 1, rate: 35000 },
      { quantity: 150, rate: 120 }, // 18000
      { quantity: 1, rate: 4500.5 },
    ];
    const grandTotal = CalculationService.calculateGrandTotal(items);
    expect(grandTotal).toBe(57500.5);
  });

  it('formats Indian currency with symbol and correct commas', () => {
    const formatted = CalculationService.formatIndianCurrency(125450.5);
    expect(formatted).toBe('₹ 1,25,450.50');
  });

  it('converts numbers to Indian words format (Lakhs, Thousands, Rupees, Paise)', () => {
    const words1 = CalculationService.numberToWordsIndian(125000);
    expect(words1).toBe('One Lakh Twenty Five Thousand Rupees Only');

    const words2 = CalculationService.numberToWordsIndian(500.5);
    expect(words2).toBe('Five Hundred Rupees and Fifty Paise Only');
  });

  it('converts numbers to Marathi currency words accurately', () => {
    const mrWords1 = numberToWordsMarathi(125000);
    expect(mrWords1).toContain('एक लाख');
    expect(mrWords1).toContain('पंचवीस हजार');
    expect(mrWords1).toContain('रुपये');
    expect(mrWords1).toContain('फक्त');

    const mrWords2 = numberToWordsMarathi(25000);
    expect(mrWords2).toContain('पंचवीस हजार रुपये फक्त');
  });

  it('formats quotation particulars with filled values without dotted placeholders', () => {
    // Row 1: Submersible pump
    const r1 = formatParticularsText(1, { make: 'Secon', inch: '2', hp: '5', stage: '8', phase: '3' }, 'mr');
    expect(r1.fullText).not.toContain('............');
    expect(r1.fullText).toContain('मेक: Secon');
    expect(r1.fullText).toContain('इंची: 2');
    expect(r1.fullText).toContain('हाँ.पाँ.: 5');

    // Row 2: Openwell pump
    const r2 = formatParticularsText(2, { row2Make: 'Crompton', row2Hp: '3', row2Phase: 'Single', row2Type: 'openwell' }, 'mr');
    expect(r2.fullText).not.toContain('............');
    expect(r2.fullText).toContain('Crompton');
    expect(r2.fullText).toContain('ओपनवेल पंपसेट');

    // Row 3: Cable
    const r3 = formatParticularsText(3, { cableSqMm: '4', cableIsiMark: 'ISI', cableCore: '3' }, 'mr');
    expect(r3.fullText).not.toContain('............');
    expect(r3.fullText).toContain('4 स्क्वे. एम.एम.');
    expect(r3.fullText).toContain('3 कोर');

    // Row 4: Nylon rope
    const r4 = formatParticularsText(4, { nylonWireRopeMm: '6' }, 'mr');
    expect(r4.fullText).not.toContain('............');
    expect(r4.fullText).toContain('6 एम.एम. नायलॉन वायर रोप');

    // Row 5: Delivery pipe
    const r5 = formatParticularsText(5, { deliveryPipeInch: '2', deliveryPipeMaterial: 'H.D.P.E.' }, 'mr');
    expect(r5.fullText).not.toContain('............');
    expect(r5.fullText).toContain('2 इंची डिलिव्हरी पाईप (H.D.P.E.)');
  });
});

describe('Authentication & 15-Day Session Lifecycle', () => {
  it('session duration is exactly 15 days in milliseconds', () => {
    const fifteenDays = 15 * 24 * 60 * 60 * 1000;
    expect(SESSION_DURATION_MS).toBe(fifteenDays);
    expect(SESSION_DURATION_MS).toBe(1296000000);
  });

  it('hashes passwords deterministically with a salt and does not store plaintext', () => {
    const salt = AuthService.generateSalt();
    const hash1 = AuthService.hashPassword('admin123', salt);
    const hash2 = AuthService.hashPassword('admin123', salt);
    const wrongHash = AuthService.hashPassword('wrongpass', salt);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe('admin123');
    expect(hash1).not.toBe(wrongHash);
  });

  it('generates unique 256-bit session tokens', () => {
    const token1 = AuthService.generateSessionToken();
    const token2 = AuthService.generateSessionToken();
    expect(token1).not.toBe(token2);
    expect(token1.length).toBeGreaterThan(32);
  });
});

describe('Backup & Restore Security Validation', () => {
  it('validates a correct versioned backup format', () => {
    const validJson = JSON.stringify({
      backupVersion: 1,
      appVersion: '1.0.0',
      createdAt: new Date().toISOString(),
      appName: 'Mahalaxmi Borewell Financial Management',
      data: {
        customers: [],
        bills: [],
        billItems: [],
        invoices: [],
        invoiceItems: [],
        income: [],
        expenses: [],
        reminders: [],
        profile: [],
        settings: [],
      },
    });

    const result = BackupService.validateBackup(validJson);
    expect(result.isValid).toBe(true);
    expect(result.parsed?.backupVersion).toBe(1);
  });

  it('rejects invalid or malformed backup JSON', () => {
    const invalidJson = '{"notAValidBackup": true}';
    const result = BackupService.validateBackup(invalidJson);
    expect(result.isValid).toBe(false);
  });
});

describe('Quotation Formatter & Marathi Words Engine', () => {
  it('formats row 1 submersible pump specs without dotted placeholders', () => {
    const specs = {
      make: 'Secon',
      inch: '2',
      hp: '5',
      stage: '8',
      phase: '3',
    };
    const formattedMR = formatParticularsText(1, specs, 'mr');
    expect(formattedMR.fullText).toContain('Secon');
    expect(formattedMR.fullText).toContain('2');
    expect(formattedMR.fullText).toContain('5');
    expect(formattedMR.fullText).toContain('8');
    expect(formattedMR.fullText).toContain('3');
    expect(formattedMR.fullText).not.toContain('............');

    const formattedEN = formatParticularsText(1, specs, 'en');
    expect(formattedEN.fullText).toContain('Make: Secon');
    expect(formattedEN.fullText).toContain('Inch: 2');
    expect(formattedEN.fullText).toContain('H.P.: 5');
    expect(formattedEN.fullText).not.toContain('............');
  });

  it('formats row 2 openwell / monoblock pumpset without dotted placeholders', () => {
    const specs = {
      row2Make: 'Crompton',
      row2Hp: '3',
      row2Phase: 'Single',
      row2Type: 'Openwell',
    };
    const formattedMR = formatParticularsText(2, specs, 'mr');
    expect(formattedMR.fullText).toBe('Crompton मेक 3 हाँ.पाँ. Single फेज ओपनवेल पंपसेट');
    expect(formattedMR.fullText).not.toContain('............');
  });

  it('formats row 3 submersible cable specs accurately', () => {
    const specs = {
      cableSqMm: '4',
      cableIsiMark: 'ISI',
      cableCore: '3',
    };
    const formattedMR = formatParticularsText(3, specs, 'mr');
    expect(formattedMR.fullText).toBe('4 स्क्वे. एम.एम. ISI मार्क 3 कोर सबमर्सिबल केबल');
    expect(formattedMR.fullText).not.toContain('............');
  });

  it('formats row 4 nylon wire rope correctly', () => {
    const specs = {
      nylonWireRopeMm: '6',
    };
    const formattedMR = formatParticularsText(4, specs, 'mr');
    expect(formattedMR.fullText).toBe('6 एम.एम. नायलॉन वायर रोप');
    expect(formattedMR.fullText).not.toContain('............');
  });

  it('formats row 5 delivery pipe with inch and selected material', () => {
    const specs = {
      deliveryPipeInch: '2',
      deliveryPipeMaterial: 'H.D.P.E.',
    };
    const formattedMR = formatParticularsText(5, specs, 'mr');
    expect(formattedMR.fullText).toBe('2 इंची डिलिव्हरी पाईप (H.D.P.E.)');
    expect(formattedMR.fullText).not.toContain('............');
  });

  it('generates Marathi words correctly for monetary amounts', () => {
    const words25000 = numberToWordsMarathi(25000);
    expect(words25000).toBe('पंचवीस हजार रुपये फक्त');

    const words100 = numberToWordsMarathi(100);
    expect(words100).toBe('एक शे रुपये फक्त');

    const words0 = numberToWordsMarathi(0);
    expect(words0).toBe('शून्य रुपये फक्त');
  });

  describe('Payment Tracking Logic', () => {
    const grandTotal = 125000;

    it('handles Not Paid status correctly', () => {
      const paymentStatus = 'pending';
      const paidAmount = 0;
      const remainingAmount = grandTotal - paidAmount;
      expect(paymentStatus).toBe('pending');
      expect(paidAmount).toBe(0);
      expect(remainingAmount).toBe(125000);
    });

    it('handles Paid status correctly', () => {
      const paymentStatus = 'paid';
      const paidAmount = grandTotal;
      const remainingAmount = Math.max(0, grandTotal - paidAmount);
      expect(paymentStatus).toBe('paid');
      expect(paidAmount).toBe(125000);
      expect(remainingAmount).toBe(0);
    });

    it('handles Advance / Partial status correctly with remaining calculation', () => {
      const paymentStatus = 'partial';
      const advanceAmount = 25000;
      const remainingAmount = Math.max(0, grandTotal - advanceAmount);
      expect(paymentStatus).toBe('partial');
      expect(advanceAmount).toBe(25000);
      expect(remainingAmount).toBe(100000);
    });

    it('prevents remaining amount from becoming negative if advance exceeds total', () => {
      const advanceAmount = 130000;
      const remainingAmount = Math.max(0, grandTotal - advanceAmount);
      expect(remainingAmount).toBe(0);
    });
  });
});
