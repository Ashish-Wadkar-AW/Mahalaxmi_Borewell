import { NativeModules } from 'react-native';
import { InvoicePdfService } from '../src/services/InvoicePdfService';
import { generateInvoicePdfFileName } from '../src/utils/quotationFormatters';
import { InvoiceEntity } from '../src/types/database';

describe('InvoicePdfService & generateInvoicePdfFileName', () => {
  beforeAll(() => {
    NativeModules.PdfModule = {
      generatePdfFromHtml: jest.fn().mockImplementation((html, fileName) =>
        Promise.resolve({
          success: true,
          uri: 'content://media/external/downloads/2001',
          filePath: `/storage/emulated/0/Download/${fileName}`,
          fileName: fileName,
          generatedPath: `/data/user/0/com.mahalaxmi_borewell/cache/temp_123_${fileName}`,
        }),
      ),
      findExistingPdf: jest.fn().mockResolvedValue(null),
      checkFileExists: jest.fn().mockResolvedValue(true),
      openPdf: jest.fn().mockResolvedValue(true),
    };
  });

  describe('generateInvoicePdfFileName', () => {
    it('creates formatted filename with 5-letter uppercase first name: ASHIS_20261001_INV-001.pdf', () => {
      const fileName = generateInvoicePdfFileName('Ashish Wadkar', '2026-10-01', 'INV-001');
      expect(fileName).toBe('ASHIS_20261001_INV-001.pdf');
    });

    it('creates formatted filename with short first name: RAJ_20261001_INV-002.pdf', () => {
      const fileName = generateInvoicePdfFileName('Raj Patil', '2026-10-01', 'INV-002');
      expect(fileName).toBe('RAJ_20261001_INV-002.pdf');
    });

    it('creates formatted filename for Rahul: RAHUL_20261001_INV-003.pdf', () => {
      const fileName = generateInvoicePdfFileName('Rahul Patil', '2026-10-01', 'INV-003');
      expect(fileName).toBe('RAHUL_20261001_INV-003.pdf');
    });

    it('appends 2-digit collision suffix when collisionIndex is provided', () => {
      const fileName = generateInvoicePdfFileName('Ashish Wadkar', '2026-10-01', 'INV-001', 1);
      expect(fileName).toBe('ASHIS_20261001_INV-001_01.pdf');

      const fileName2 = generateInvoicePdfFileName('Ashish Wadkar', '2026-10-01', 'INV-001', 2);
      expect(fileName2).toBe('ASHIS_20261001_INV-001_02.pdf');
    });
  });

  const sampleInvoice: InvoiceEntity = {
    id: 'inv_test_001',
    invoiceNumber: 'INV-001',
    billId: 'bill_test_001',
    sourceQuotationId: 'bill_test_001',
    sourceQuotationNumber: 'Q-001',
    customerId: 'cust_01',
    customerName: 'Ashish Wadkar',
    customerPhone: '7447234294',
    customerAddress: 'Kolhapur',
    date: '2026-10-01',
    borewellDepth: 300,
    waterBearing: 2.0,
    boreSize: 6.5,
    deliveryDays: 7,
    subtotal: 50000,
    taxAmount: 0,
    grandTotal: 50000,
    amountInWords: 'पन्नास हजार रुपये फक्त',
    amountInWordsMarathi: 'पन्नास हजार रुपये फक्त',
    amountInWordsEnglish: 'Fifty Thousand Rupees Only',
    paymentStatus: 'partial',
    paidAmount: 20000,
    remainingAmount: 30000,
    notes: 'Test invoice notes',
    items: [
      {
        id: 'inv_item_1',
        invoiceId: 'inv_test_001',
        srNo: 1,
        description: 'Borewell Drilling 6.5 inch',
        particularsMr: 'बोरवेल ड्रिलिंग ६.५ इंच',
        particularsEn: 'Borewell Drilling 6.5 inch',
        quantity: 300,
        rate: 100,
        total: 30000,
        itemSpecs: JSON.stringify({ depth: '300' }),
      },
      {
        id: 'inv_item_2',
        invoiceId: 'inv_test_001',
        srNo: 2,
        description: 'PVC Casing Pipe',
        particularsMr: 'पीव्हीसी केसिंग पाईप',
        particularsEn: 'PVC Casing Pipe',
        quantity: 50,
        rate: 400,
        total: 20000,
        itemSpecs: JSON.stringify({ size: '7 inch' }),
      },
    ],
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  };

  it('generates an Invoice PDF with correct filename and Downloads path', async () => {
    const result = await InvoicePdfService.generateInvoicePdf(sampleInvoice, 'mr');
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.fileName).toBe('ASHIS_20261001_INV-001.pdf');
    expect(result.filePath).toContain('ASHIS_20261001_INV-001.pdf');
    expect(result.uri).toContain('content://');
    expect(NativeModules.PdfModule.checkFileExists).toHaveBeenCalled();
  });

  it('builds Marathi Invoice HTML with Devanagari labels, stamp, signature, and payment breakdown', () => {
    const html = InvoicePdfService.buildInvoiceHtml(sampleInvoice, 'mr');
    expect(html).toContain('टॅक्स इनव्हॉइस');
    expect(html).toContain('महालक्ष्मी बोरवेल');
    expect(html).toContain('Ashish Wadkar'); // User-entered customer name preserved
    expect(html).toContain('Kolhapur'); // User-entered address preserved
    expect(html).toContain('INV-001');
    expect(html).toContain('50,000'); // Grand total
    expect(html).toContain('20,000'); // Paid amount
    expect(html).toContain('30,000'); // Remaining amount
    expect(html).toContain('अ‍ॅडव्हान्स'); // Payment status label for partial
    expect(html).toContain('अक्षरी रुपये');
    expect(html).toContain('पन्नास हजार रुपये फक्त');
    expect(html).toContain('stamp-image');
    expect(html).toContain('signature-image');
  });

  it('builds English Invoice HTML with English labels and payment breakdown', () => {
    const html = InvoicePdfService.buildInvoiceHtml(sampleInvoice, 'en');
    expect(html).toContain('TAX INVOICE');
    expect(html).toContain('Mahalaxmi Borewell');
    expect(html).toContain('Ashish Wadkar');
    expect(html).toContain('Invoice No.');
    expect(html).toContain('INV-001');
    expect(html).toContain('50,000');
    expect(html).toContain('20,000');
    expect(html).toContain('30,000');
    expect(html).toContain('Advance'); // English payment status label
    expect(html).toContain('Amount in Words');
    expect(html).toContain('Fifty Thousand Rupees Only');
    expect(html).toContain('stamp-image');
    expect(html).toContain('signature-image');
  });

  it('calls openPdf safely for viewing generated Invoice PDF', async () => {
    const canOpen = await InvoicePdfService.openPdf('content://media/external/downloads/2001');
    expect(canOpen).toBe(true);
    expect(NativeModules.PdfModule.openPdf).toHaveBeenCalledWith(
      'content://media/external/downloads/2001',
    );
  });
});
