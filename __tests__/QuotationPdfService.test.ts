import { NativeModules } from 'react-native';
import { QuotationPdfService } from '../src/services/QuotationPdfService';
import { QuotationEntity } from '../src/types/database';

describe('QuotationPdfService', () => {
  beforeAll(() => {
    NativeModules.PdfModule = {
      generatePdfFromHtml: jest.fn().mockResolvedValue({
        success: true,
        uri: 'content://media/external/downloads/1001',
        filePath: '/storage/emulated/0/Download/Quotation_Q-001.pdf',
        fileName: 'Quotation_Q-001.pdf',
        generatedPath: '/data/user/0/com.mahalaxmi_borewell/cache/temp_123_Quotation_Q-001.pdf',
      }),
      checkFileExists: jest.fn().mockResolvedValue(true),
      openPdf: jest.fn().mockResolvedValue(true),
    };
  });

  const sampleQuotation: QuotationEntity = {
    id: 'quote_test_001',
    quotationNumber: 'Q-001',
    billNumber: 'Q-001',
    customerId: 'cust_01',
    customerName: 'Shri Dattatray Patil',
    customerPhone: '9876543210',
    customerAddress: 'Hanbarwadi, Karveer',
    date: '2026-09-23',
    borewellDepth: 350,
    waterBearing: 2.5,
    boreSize: 6.5,
    totalAmount: 45000,
    amountInWords: 'पंचेचाळीस हजार रुपये फक्त',
    amountInWordsMarathi: 'पंचेचाळीस हजार रुपये फक्त',
    amountInWordsEnglish: 'Forty Five Thousand Rupees Only',
    deliveryDays: 7,
    status: 'draft',
    paymentStatus: 'partial',
    paidAmount: 20000,
    remainingAmount: 25000,
    items: [
      {
        id: 'item_1',
        billId: 'quote_test_001',
        srNo: 1,
        particularsMr: 'सबमर्सिबल पंपसेट सिकॉन, चॅम्पियन, जलसन',
        particularsEn: 'Submersible Pumpset',
        quantity: 1,
        rate: 25000,
        total: 25000,
        itemSpecs: JSON.stringify({ make: 'जलसन', hp: '5', stage: '10' }),
        createdAt: '2026-09-23T10:00:00.000Z',
      },
      {
        id: 'item_2',
        billId: 'quote_test_001',
        srNo: 3,
        particularsMr: 'केबल',
        particularsEn: 'Cable',
        quantity: 100,
        rate: 200,
        total: 20000,
        itemSpecs: JSON.stringify({ cableSqMm: '4', cableCore: '3' }),
        createdAt: '2026-09-23T10:00:00.000Z',
      },
    ],
    createdAt: '2026-09-23T10:00:00.000Z',
    updatedAt: '2026-09-23T10:00:00.000Z',
  };

  it('generates a verified PDF result with MediaStore uri, download filePath and fileName', async () => {
    const result = await QuotationPdfService.generateQuotationPdf(sampleQuotation, 'mr');
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.fileName).toBe('Quotation_Q-001.pdf');
    expect(result.filePath).toContain('Quotation_Q-001.pdf');
    expect(result.uri).toContain('content://');
    expect(NativeModules.PdfModule.checkFileExists).toHaveBeenCalled();
  });

  it('builds HTML containing all key quotation elements', async () => {
    const html = (QuotationPdfService as any).buildQuotationHtml(sampleQuotation, 'mr');
    expect(html).toContain('महालक्ष्मी बोरवेल');
    expect(html).toContain('Shri Dattatray Patil');
    expect(html).toContain('Q-001');
    expect(html).toContain('350'); // Depth
    expect(html).toContain('25,000'); // Item 1 total
    expect(html).toContain('45,000'); // Grand total
    expect(html).toContain('अक्षरी रुपये');
    expect(html).toContain('पंचेचाळीस हजार रुपये फक्त');
    expect(html).toContain('अटी व शर्ती');
    expect(html).toContain('stamp-image');
    expect(html).toContain('signature-image');
  });

  it('calls openPdf safely', async () => {
    const canOpen = await QuotationPdfService.openPdf('content://media/external/downloads/1001');
    expect(canOpen).toBe(true);
    expect(NativeModules.PdfModule.openPdf).toHaveBeenCalledWith('content://media/external/downloads/1001');
  });
});
