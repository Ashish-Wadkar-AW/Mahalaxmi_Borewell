import { NativeModules, Platform, Image } from 'react-native';
import { InvoiceEntity, InvoiceItemEntity } from '../types/database';
import { CalculationService } from './CalculationService';
import {
  formatParticularsText,
  numberToWordsMarathi,
  generateInvoicePdfFileName,
} from '../utils/quotationFormatters';
import { LOGO_QUOTATION_BASE64 } from '../assets/images/logoBase64';
import {
  OFFICIAL_STAMP_BASE64,
  AUTHORIZED_SIGNATURE_BASE64,
} from '../assets/images/stampSignatureBase64';
import officialStampPng from '../assets/official_stamp.png';
import authorizedSignaturePng from '../assets/authorized_signature.png';
import {
  GeneratePdfResult,
  ExistingPdfResult,
  QuotationPdfService,
} from './QuotationPdfService';
import { InvoiceRepository } from '../database/repositories/InvoiceRepository';
import { BillRepository } from '../database/repositories/BillRepository';

const getPdfModule = () => NativeModules.PdfModule;

export class InvoicePdfService {
  /**
   * Generates a unique, collision-safe filename for an invoice:
   * <FirstNameFirst5Letters>_<YYYYMMDD>_<InvoiceNumber>.pdf
   * Fallback on collision: <FirstNameFirst5Letters>_<YYYYMMDD>_<InvoiceNumber>_01.pdf
   */
  public static async getUniqueInvoicePdfFileName(
    invoice: InvoiceEntity,
  ): Promise<string> {
    const rawCustomerName =
      invoice.customerName ||
      (invoice as any).name ||
      (invoice as any).firstName ||
      (invoice as any).customer ||
      (invoice as any).clientName ||
      '';
    const invoiceDate = invoice.date;
    const invoiceNumber = invoice.invoiceNumber || 'INV-001';

    const pdfModule = getPdfModule();
    let collisionIndex = 0;
    while (true) {
      const candidateFileName = generateInvoicePdfFileName(
        rawCustomerName,
        invoiceDate,
        invoiceNumber,
        collisionIndex,
      );

      if (!pdfModule || typeof pdfModule.findExistingPdf !== 'function') {
        return candidateFileName;
      }

      try {
        const checkResult = await pdfModule.findExistingPdf(candidateFileName);
        if (!checkResult?.exists) {
          return candidateFileName;
        }
      } catch {
        return candidateFileName;
      }

      collisionIndex++;
      if (collisionIndex > 99) {
        return candidateFileName;
      }
    }
  }

  /**
   * Checks whether an invoice PDF already exists in the Downloads folder for a given invoice.
   */
  public static async findExistingPdf(
    invoiceNumberOrInvoice: string | InvoiceEntity,
  ): Promise<ExistingPdfResult> {
    const pdfModule = getPdfModule();
    if (!pdfModule || typeof pdfModule.findExistingPdf !== 'function') {
      return { exists: false };
    }

    try {
      if (typeof invoiceNumberOrInvoice === 'object' && invoiceNumberOrInvoice) {
        const invoice = invoiceNumberOrInvoice;
        // Check if saved pdfUri exists
        if (invoice.pdfUri) {
          const fileExists = await QuotationPdfService.checkFileExists(invoice.pdfUri);
          if (fileExists) {
            return {
              exists: true,
              uri: invoice.pdfUri,
              filePath: invoice.pdfUri,
              fileName: invoice.pdfFileName,
            };
          }
        }

        const rawCustomerName =
          invoice.customerName ||
          (invoice as any).name ||
          (invoice as any).firstName ||
          (invoice as any).customer ||
          (invoice as any).clientName ||
          '';
        const expectedFileName = generateInvoicePdfFileName(
          rawCustomerName,
          invoice.date,
          invoice.invoiceNumber,
        );
        const check = await pdfModule.findExistingPdf(expectedFileName);
        if (check?.exists) return check;
      } else {
        const invoiceNumber = invoiceNumberOrInvoice;
        const cleanInvNumber = invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
        const legacyFileName = `Invoice_${cleanInvNumber}.pdf`;
        const legacyCheck = await pdfModule.findExistingPdf(legacyFileName);
        if (legacyCheck?.exists) return legacyCheck;
      }
      return { exists: false };
    } catch (_: any) {
      return { exists: false };
    }
  }

  /**
   * Opens the generated PDF using the device's native PDF viewer.
   */
  public static async openPdf(savedPdfUri: string): Promise<boolean> {
    console.log('[INVOICE][PDF][VIEW]', { uri: savedPdfUri });
    return QuotationPdfService.openPdf(savedPdfUri);
  }

  /**
   * Generates a high-fidelity PDF from the invoice data matching the official document layout.
   */
  public static async generateInvoicePdf(
    invoice: InvoiceEntity,
    language: 'mr' | 'en' = 'mr',
    customItems?: any[],
  ): Promise<GeneratePdfResult> {
    const invoiceNumber = invoice.invoiceNumber || 'INV-001';

    console.log('[INVOICE][PDF][START]', invoiceNumber);
    console.log('[INVOICE][PDF][LANGUAGE]', language);

    try {
      // 1. Data Preparation Step
      let items: any[] = customItems || invoice.items || [];
      let associatedBill: any = invoice.bill || null;

      // If items are not populated, attempt to load from repository
      if (items.length === 0 && invoice.id) {
        try {
          const freshInvoice = await InvoiceRepository.getInvoiceById(invoice.id);
          if (freshInvoice?.items && freshInvoice.items.length > 0) {
            items = freshInvoice.items;
          }
        } catch {}
      }

      // If still empty or vehicle details needed, check associated bill
      const targetQuotationId = invoice.sourceQuotationId || invoice.billId;
      if (targetQuotationId && (!associatedBill || items.length === 0)) {
        try {
          const b = await BillRepository.getBillById(targetQuotationId);
          if (b) {
            associatedBill = b;
            if (items.length === 0 && b.items && b.items.length > 0) {
              items = b.items;
            }
          }
        } catch {}
      }

      const html = this.buildInvoiceHtml(invoice, language, items, associatedBill);

      // Generate unique collision-safe filename:
      // <FirstNameFirst5Letters>_<YYYYMMDD>_<InvoiceNumber>.pdf
      const fileName = await this.getUniqueInvoicePdfFileName(invoice);

      console.log('[INVOICE][PDF][FILENAME]', fileName);

      // 2. PDF Native Engine Invocation
      const pdfModule = getPdfModule();
      if (!pdfModule || typeof pdfModule.generatePdfFromHtml !== 'function') {
        const err: any = new Error(
          'Native PDF engine is not available. Please rebuild the Android application (npm run android) to load native modules.',
        );
        err.code = 'MODULE_NOT_FOUND';
        console.error('[INVOICE][PDF][ERROR]', {
          invoiceNumber,
          message: err.message,
          code: err.code,
        });
        throw err;
      }

      // Wrap in 15-second timeout race
      const timeoutMs = 15000;
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          const timeoutErr: any = new Error(`Invoice PDF generation timed out after ${timeoutMs / 1000} seconds.`);
          timeoutErr.code = 'TIMEOUT';
          console.error('[INVOICE][PDF][ERROR]', {
            invoiceNumber,
            message: timeoutErr.message,
            code: timeoutErr.code,
          });
          reject(timeoutErr);
        }, timeoutMs);
      });

      const generatePromise = pdfModule.generatePdfFromHtml(html, fileName);

      let result: GeneratePdfResult;
      try {
        result = await Promise.race([generatePromise, timeoutPromise]);
      } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
      }

      // 3. Downloads Saving Verification & Required Audit Logs
      console.log('[INVOICE][PDF][SAVE]', {
        fileName: result.fileName,
        filePath: result.filePath,
        uri: result.uri,
      });

      // 4. Verification Step
      const targetUriOrPath = result.uri || result.filePath;
      const exists = await QuotationPdfService.checkFileExists(targetUriOrPath);

      if (!exists) {
        const err: any = new Error('Invoice PDF was generated but could not be verified in Downloads folder.');
        err.code = 'VERIFY_FAILED';
        console.error('[INVOICE][PDF][ERROR]', {
          invoiceNumber,
          message: err.message,
          code: err.code,
        });
        throw err;
      }

      console.log('[INVOICE][PDF][SUCCESS]', {
        invoiceNumber,
        fileName: result.fileName,
        uri: result.uri,
      });

      return result;
    } catch (error: any) {
      console.error('[INVOICE][PDF][ERROR]', {
        invoiceNumber,
        message: error?.message || String(error),
        code: error?.code,
      });
      throw error;
    }
  }

  /**
   * Constructs the HTML document for the Invoice styled identically to the official document view.
   */
  public static buildInvoiceHtml(
    invoice: InvoiceEntity,
    language: 'mr' | 'en',
    items?: any[],
    associatedBill?: any,
  ): string {
    const isMarathi = language === 'mr';
    const resolvedItems: any[] =
      items && items.length > 0
        ? items
        : invoice.items && invoice.items.length > 0
          ? invoice.items
          : associatedBill?.items || [];
    const invNumber = invoice.invoiceNumber || 'INV-001';
    const sourceQuoteNumber =
      invoice.sourceQuotationNumber ||
      associatedBill?.quotationNumber ||
      associatedBill?.billNumber ||
      '';
    const grandTotal = invoice.grandTotal || 0;
    const { rupees, paise } = CalculationService.splitRupeesAndPaise(grandTotal);

    const displayWords =
      (isMarathi ? invoice.amountInWordsMarathi : invoice.amountInWordsEnglish) ||
      invoice.amountInWords ||
      associatedBill?.amountInWordsMarathi ||
      associatedBill?.amountInWords ||
      (isMarathi ? numberToWordsMarathi(grandTotal) : CalculationService.numberToWordsIndian(grandTotal));

    const borewellDepth =
      typeof invoice.borewellDepth === 'number' && invoice.borewellDepth > 0
        ? invoice.borewellDepth
        : associatedBill?.borewellDepth || '0';
    const waterBearing =
      typeof invoice.waterBearing === 'number' && invoice.waterBearing > 0
        ? invoice.waterBearing
        : associatedBill?.waterBearing || '0';
    const boreSize =
      typeof invoice.boreSize === 'number' && invoice.boreSize > 0
        ? invoice.boreSize
        : associatedBill?.boreSize || '0';
    const deliveryDays = invoice.deliveryDays || associatedBill?.deliveryDays || '7';

    const vehicleText = [
      (invoice as any).vehicleNumber || (invoice as any).vehicle || associatedBill?.vehicleNumber || associatedBill?.vehicle,
      (invoice as any).vehicleType || associatedBill?.vehicleType,
      (invoice as any).vehicleDetails || associatedBill?.vehicleDetails,
    ]
      .filter(Boolean)
      .join(' - ');

    const paymentStatus = invoice.paymentStatus || 'pending';
    const paidAmount =
      typeof invoice.paidAmount === 'number'
        ? invoice.paidAmount
        : paymentStatus === 'paid'
          ? grandTotal
          : 0;
    const remainingAmount =
      typeof invoice.remainingAmount === 'number'
        ? invoice.remainingAmount
        : paymentStatus === 'paid'
          ? 0
          : grandTotal;

    const paymentStatusLabel =
      paymentStatus === 'paid'
        ? isMarathi ? 'पूर्ण जमा' : 'Paid'
        : paymentStatus === 'partial'
          ? isMarathi ? 'अ‍ॅडव्हान्स' : 'Advance'
          : isMarathi ? 'देणे बाकी' : 'Not Paid';

    // Generate table rows
    const rowsHtml = resolvedItems
      .map((item, index) => {
        let specs: Record<string, any> = {};
        if (typeof item.itemSpecs === 'string') {
          try {
            specs = JSON.parse(item.itemSpecs);
          } catch {}
        } else if (item.itemSpecs && typeof item.itemSpecs === 'object') {
          specs = item.itemSpecs;
        } else if (item.specs && typeof item.specs === 'object') {
          specs = item.specs;
        }

        const formatted = formatParticularsText(item.srNo, specs, language);
        const lineSplit = CalculationService.splitRupeesAndPaise(item.total);
        const hasRate = Number(item.rate) > 0;
        const hasQty = Number(item.quantity) > 0;
        const isAlt = index % 2 === 1;

        const rowTitle = isMarathi
          ? item.particularsMr || item.description || formatted.title
          : item.particularsEn || item.description || formatted.title;

        return `
          <tr class="${isAlt ? 'alt-row' : ''}">
            <td class="col-sr">${item.srNo}</td>
            <td class="col-particulars">
              <div class="part-title">${rowTitle}</div>
              ${formatted.specsSubtitle ? `<div class="part-subtitle">${formatted.specsSubtitle}</div>` : ''}
            </td>
            <td class="col-qty">${hasQty ? item.quantity : '-'}</td>
            <td class="col-rate">${hasRate ? Number(item.rate).toLocaleString('en-IN') : '-'}</td>
            <td class="col-total">
              ${
                item.total > 0
                  ? `${lineSplit.rupees.toLocaleString('en-IN')}<span class="paise">.${lineSplit.paise.toString().padStart(2, '0')}</span>`
                  : '-'
              }
            </td>
          </tr>
        `;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=794, initial-scale=1.0">
  <title>Invoice ${invNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 794px;
      max-width: 794px;
      background-color: #FAF7F0;
      color: #1A1412;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", "Lohit Devanagari", sans-serif;
      font-size: 10px;
      line-height: 1.3;
      margin: 0 auto;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      overflow-x: hidden;
    }
    .page-container {
      width: 794px;
      max-width: 794px;
      padding: 10px 18px;
      box-sizing: border-box;
    }
    .document-sheet {
      width: 100%;
      max-width: 100%;
      background-color: #FAF7F0;
      border: 1.8px solid #7A1C1C;
      border-radius: 6px;
      padding: 7px 12px;
      box-sizing: border-box;
    }
    .sacred-header {
      width: 100%;
      text-align: center;
      font-size: 10.5px;
      font-weight: 800;
      color: #7A1C1C;
      margin: 0 auto 5px auto;
      letter-spacing: 0.6px;
      display: block;
    }
    .memo-header {
      display: flex;
      flex-direction: row;
      align-items: center;
      border-bottom: 1.5px solid #D4C6AB;
      padding-bottom: 5px;
      margin-bottom: 5px;
    }
    .logo-col {
      width: 90px;
      text-align: center;
      margin-right: 8px;
      flex-shrink: 0;
    }
    .header-spacer {
      width: 90px;
      margin-left: 8px;
      flex-shrink: 0;
    }
    .quotation-logo {
      width: 86px;
      height: auto;
      max-height: 52px;
      object-fit: contain;
      display: block;
    }
    .banner-col {
      flex: 1;
      text-align: center;
    }
    .banner-box {
      background-color: #7A1C1C;
      color: #FFFFFF;
      padding: 3px 10px;
      border-radius: 4px;
      display: inline-block;
    }
    .banner-main-title {
      font-size: 19px;
      font-weight: 900;
      line-height: 1.15;
      letter-spacing: 0.4px;
      color: #FFFFFF;
    }
    .banner-sub-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.2px;
      color: #FFF2DF;
      margin-top: 1px;
    }
    .address-text {
      font-size: 8.5px;
      font-weight: 700;
      color: #443830;
      margin-top: 3px;
      line-height: 1.2;
    }
    .phone-text {
      font-size: 8.5px;
      font-weight: 800;
      color: #7A1C1C;
      margin-top: 1.5px;
      letter-spacing: 0.3px;
    }
    .metadata-box {
      background-color: #FFFFFF;
      border: 1px solid #D4C6AB;
      border-radius: 4px;
      padding: 4px 8px;
      margin-bottom: 4px;
    }
    .meta-top-row {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      border-bottom: 1px dashed #E2D7C3;
      padding-bottom: 3px;
      margin-bottom: 3px;
    }
    .quote-no {
      font-size: 9.5px;
      font-weight: 800;
      color: #7A1C1C;
    }
    .quote-date {
      font-size: 9px;
      font-weight: 700;
      color: #332A24;
    }
    .source-quote-ref {
      font-size: 8.5px;
      font-weight: 700;
      color: #6B5B4D;
      margin-top: 1px;
    }
    .field-row {
      display: flex;
      flex-direction: row;
      align-items: baseline;
      margin-bottom: 2px;
    }
    .field-label {
      width: 85px;
      font-size: 8.5px;
      font-weight: 700;
      color: #554B42;
      flex-shrink: 0;
    }
    .field-val {
      font-size: 9px;
      font-weight: 700;
      color: #1A1412;
      flex: 1;
    }
    .specs-box {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      background-color: #F3EBDD;
      border: 1px solid #D4C6AB;
      border-radius: 4px;
      padding: 3px 8px;
      margin-bottom: 4px;
    }
    .spec-item {
      font-size: 8.5px;
      font-weight: 700;
      color: #443830;
    }
    .spec-item span {
      font-weight: 800;
      color: #7A1C1C;
    }
    .doc-title-row {
      text-align: center;
      margin: 4px 0 5px 0;
    }
    .doc-title-badge {
      display: inline-block;
      background-color: #7A1C1C;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 900;
      padding: 2.5px 18px;
      border-radius: 3px;
      letter-spacing: 0.8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #7A1C1C;
      background-color: #FFFFFF;
      margin-bottom: 4px;
      table-layout: fixed;
    }
    thead {
      background-color: #7A1C1C;
      color: #FFFFFF;
    }
    th {
      font-size: 8.5px;
      font-weight: 800;
      color: #FFFFFF;
      padding: 3.5px 3px;
      text-align: center;
      border: 1px solid #9B2D2D;
      white-space: nowrap;
    }
    td {
      font-size: 8.5px;
      padding: 2.5px 4px;
      border: 1px solid #E8DFD1;
      vertical-align: middle;
      color: #221A15;
    }
    .col-sr {
      width: 32px;
      text-align: center;
      font-weight: 700;
    }
    .col-particulars {
      width: 480px;
      text-align: left;
    }
    .col-qty {
      width: 50px;
      text-align: center;
      font-weight: 700;
    }
    .col-rate {
      width: 78px;
      text-align: right;
      font-weight: 700;
      padding-right: 6px;
    }
    .col-total {
      width: 90px;
      text-align: right;
      font-weight: 800;
      color: #1A1412;
      padding-right: 6px;
    }
    .part-title {
      font-weight: 700;
      color: #1A1412;
      line-height: 1.25;
    }
    .part-subtitle {
      font-size: 7.5px;
      color: #6B5B4D;
      margin-top: 1px;
      line-height: 1.15;
    }
    .alt-row {
      background-color: #FDFBF7;
    }
    .paise {
      font-size: 7px;
      color: #554B42;
    }
    .grand-total-row {
      background-color: #F3EBDD;
      font-weight: 800;
      border-top: 1.5px solid #7A1C1C;
    }
    .grand-total-label {
      text-align: right;
      font-size: 9.5px;
      font-weight: 800;
      color: #7A1C1C;
      padding-right: 8px;
    }
    .grand-total-val {
      text-align: right;
      font-size: 10.5px;
      font-weight: 900;
      color: #7A1C1C;
      padding-right: 6px;
    }
    .words-box {
      background-color: #FFFFFF;
      border: 1px solid #D4C6AB;
      border-radius: 4px;
      padding: 3px 6px;
      margin-bottom: 3px;
      font-size: 8.5px;
      display: flex;
      flex-direction: row;
      align-items: baseline;
    }
    .words-label {
      font-weight: 700;
      color: #554B42;
      margin-right: 5px;
      flex-shrink: 0;
    }
    .words-val {
      font-weight: 800;
      color: #7A1C1C;
      flex: 1;
    }
    .delivery-box {
      font-size: 8px;
      font-weight: 700;
      color: #554B42;
      margin-bottom: 4px;
      padding-left: 2px;
    }
    .delivery-box span {
      font-weight: 800;
      color: #1A1412;
    }
    .payment-summary {
      display: flex;
      flex-direction: row;
      background-color: #FFFFFF;
      border: 1px solid #D4C6AB;
      border-radius: 4px;
      padding: 4px;
      margin-bottom: 5px;
    }
    .pay-col {
      flex: 1;
      text-align: center;
      border-right: 1px solid #E8DFD1;
    }
    .pay-col:last-child {
      border-right: none;
    }
    .pay-label {
      font-size: 7.5px;
      font-weight: 700;
      color: #6B5B4D;
      margin-bottom: 1.5px;
      text-transform: uppercase;
    }
    .pay-val {
      font-size: 9.5px;
      font-weight: 800;
    }
    .pay-status {
      color: #7A1C1C;
    }
    .pay-paid {
      color: #1E6B37;
    }
    .pay-rem {
      color: #A33A00;
    }
    .terms-box {
      background-color: #FFFFFF;
      border: 1px solid #D4C6AB;
      border-radius: 4px;
      padding: 3px 6px;
      margin-bottom: 4px;
    }
    .terms-header {
      font-size: 8.5px;
      font-weight: 800;
      color: #7A1C1C;
      margin-bottom: 2px;
    }
    .term-item {
      font-size: 7.8px;
      color: #332A24;
      margin-bottom: 1.2px;
      line-height: 1.15;
    }
    .signature-section {
      width: 100%;
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 2px;
      box-sizing: border-box;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .stamp-box {
      border: 1.5px dashed #C4B5A5;
      padding: 2px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 82px;
      height: 72px;
      box-sizing: border-box;
      background-color: transparent;
    }
    .stamp-image {
      max-width: 76px;
      max-height: 66px;
      object-fit: contain;
      display: block;
    }
    .sign-col {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
    }
    .company-sign {
      font-size: 9.5px;
      font-weight: 800;
      color: #7A1C1C;
      margin-bottom: 2px;
    }
    .signature-image {
      max-width: 130px;
      max-height: 48px;
      object-fit: contain;
      display: block;
      margin: 1px auto;
    }
    .sign-title {
      font-size: 8.5px;
      font-weight: 700;
      color: #554B42;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="document-sheet">
      <div class="sacred-header">
        ${isMarathi ? '|| श्री जोतिर्लिंग प्रसन्न ||' : '|| Shri Jyotirling Prasann ||'}
      </div>

      <div class="memo-header">
        <div class="logo-col">
          <img
            src="${LOGO_QUOTATION_BASE64}"
            class="quotation-logo"
            alt="Mahalaxmi Borewell Vehicle"
          />
        </div>
        <div class="banner-col">
          <div class="banner-box">
            <div class="banner-main-title">${isMarathi ? 'महालक्ष्मी बोरवेल' : 'Mahalaxmi Borewell'}</div>
            <div class="banner-sub-title">${isMarathi ? 'इलेक्ट्रिकल्स ॲन्ड मेकॅनिकल्स' : 'Electricals & Mechanicals'}</div>
          </div>
          <div class="address-text">
            ${isMarathi ? 'मु. पो. हणबरवाडी, ता. करवीर, जि. कोल्हापूर.' : 'At Post Hanbarwadi, Taluka Karveer, District Kolhapur.'}
          </div>
          <div class="phone-text">मो. 8379918585, 8329533649, 7498236650</div>
        </div>
        <div class="header-spacer"></div>
      </div>

      <div class="metadata-box">
        <div class="meta-top-row">
          <div>
            <div class="quote-no">${isMarathi ? 'इनव्हॉइस नं. :' : 'Invoice No. :'} ${invNumber}</div>
            ${
              sourceQuoteNumber
                ? `<div class="source-quote-ref">${isMarathi ? 'संदर्भ कोटेशन :' : 'Source Quotation :'} ${sourceQuoteNumber}</div>`
                : ''
            }
          </div>
          <div class="quote-date">${isMarathi ? 'दिनांक :' : 'Date :'} ${invoice.date || '-'}</div>
        </div>
        <div class="field-row">
          <div class="field-label">${isMarathi ? 'नांव :' : 'Name :'}</div>
          <div class="field-val">${invoice.customerName || '-'}</div>
        </div>
        <div class="field-row">
          <div class="field-label">${isMarathi ? 'पत्ता :' : 'Address :'}</div>
          <div class="field-val">${invoice.customerAddress || '-'}</div>
        </div>
        ${
          invoice.customerPhone
            ? `<div class="field-row">
                <div class="field-label">${isMarathi ? 'फोन नंबर :' : 'Phone :'}</div>
                <div class="field-val">${invoice.customerPhone}</div>
              </div>`
            : ''
        }
        ${
          vehicleText
            ? `<div class="field-row">
                <div class="field-label">${isMarathi ? 'गाडी / वाहन :' : 'Vehicle :'}</div>
                <div class="field-val">${vehicleText}</div>
              </div>`
            : ''
        }
      </div>

      <div class="specs-box">
        <div class="spec-item">
          ${isMarathi ? '१. बोरवेलची खोली :' : '1. Borewell Depth :'} <span>${borewellDepth} ${isMarathi ? 'फूट' : 'Feet'}</span>
        </div>
        <div class="spec-item">
          ${isMarathi ? '२. बेअरला लागलेले पाणी :' : '2. Water struck at bearing :'} <span>${waterBearing} ${isMarathi ? 'इंच' : 'Inch'}</span>
        </div>
        <div class="spec-item">
          ${isMarathi ? '३. बोर साईज :' : '3. Bore Size :'} <span>${boreSize} ${isMarathi ? 'इंच' : 'Inch'}</span>
        </div>
      </div>

      <div class="doc-title-row">
        <div class="doc-title-badge">${isMarathi ? 'टॅक्स इनव्हॉइस (TAX INVOICE)' : 'TAX INVOICE'}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="col-sr">${isMarathi ? 'अ.नं' : 'Sr'}</th>
            <th class="col-particulars">${isMarathi ? 'तपशील' : 'Details / Particulars'}</th>
            <th class="col-qty">${isMarathi ? 'नग' : 'Qty'}</th>
            <th class="col-rate">${isMarathi ? 'दर (₹)' : 'Rate (₹)'}</th>
            <th class="col-total">${isMarathi ? 'एकूण (₹)' : 'Total (₹)'}</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr class="grand-total-row">
            <td colspan="4" class="grand-total-label">${isMarathi ? 'एकूण (TOTAL) :' : 'GRAND TOTAL :'}</td>
            <td class="grand-total-val">₹ ${rupees.toLocaleString('en-IN')}.${paise.toString().padStart(2, '0')}</td>
          </tr>
        </tbody>
      </table>

      <div class="words-box">
        <span class="words-label">${isMarathi ? 'अक्षरी रुपये :' : 'Amount in Words :'}</span>
        <span class="words-val">${displayWords}</span>
      </div>

      <div class="delivery-box">
        ${isMarathi ? 'मालाची डिलिव्हरी :' : 'Goods Delivery :'} <span>${deliveryDays} ${isMarathi ? 'दिवसात मिळेल' : 'Days'}</span>
      </div>

      <div class="payment-summary">
        <div class="pay-col">
          <div class="pay-label">${isMarathi ? 'पेमेंट स्थिती' : 'Payment Status'}</div>
          <div class="pay-val pay-status">${paymentStatusLabel}</div>
        </div>
        <div class="pay-col">
          <div class="pay-label">${isMarathi ? 'जमा रक्कम' : 'Paid Amount'}</div>
          <div class="pay-val pay-paid">₹ ${Number(paidAmount).toLocaleString('en-IN')}</div>
        </div>
        <div class="pay-col">
          <div class="pay-label">${isMarathi ? 'उर्वरित बाकी' : 'Remaining'}</div>
          <div class="pay-val pay-rem">₹ ${Number(remainingAmount).toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div class="terms-box">
        <div class="terms-header">${isMarathi ? 'अटी व शर्ती :' : 'Terms & Conditions :'}</div>
        <div class="term-item">1. ${isMarathi ? 'मालाची डिलिव्हरी साईटवरती पोहोच मिळेल.' : 'Goods delivery will be delivered directly at the site.'}</div>
        <div class="term-item">2. ${isMarathi ? 'वरील किमती प्रचलित टॅक्ससह असून डिलिव्हरीच्या वेळी जे दर व टॅक्स असतील ते आकारले जातील.' : 'The above prices include applicable taxes; rates and taxes existing at the time of delivery will apply.'}</div>
        <div class="term-item">3. ${isMarathi ? `मालाची डिलिव्हरी ${deliveryDays} दिवसात मिळेल.` : `Goods delivery will be completed in ${deliveryDays} days.`}</div>
        <div class="term-item">4. ${isMarathi ? 'मटेरिअल डिलिव्हरी आधी पेमेंट पूर्ण करणेचे आहे.' : 'Full payment must be completed prior to material delivery.'}</div>
        <div class="term-item">5. ${isMarathi ? 'बोर मध्ये अथवा बोरमध्ये पंप अडकल्यास, अडकलेला पंप काढून देण्याची जबाबदारी कंपनीवर राहणार नाही.' : "If the pump gets stuck in the borewell, removing the stuck pump will not be the company's responsibility."}</div>
        <div class="term-item">6. ${isMarathi ? 'वरील इनव्हॉइसमध्ये नमूद केलेल्या तपशीलापेक्षा (इस्टिमेटपेक्षा) जादा मटेरिअल लागल्यास पार्टीला ते रोखीने खरेदी करावे लागेल.' : 'If extra materials are required beyond the estimate provided in the invoice, the client must purchase them in cash.'}</div>
      </div>

      <div class="signature-section">
        <div class="stamp-box">
          <img src="${OFFICIAL_STAMP_BASE64}" class="stamp-image" alt="Official Stamp" />
        </div>
        <div class="sign-col">
          <div class="company-sign">${isMarathi ? 'महालक्ष्मी बोरवेल्स् आणि पंप्स् करिता' : 'For Mahalaxmi Borewells & Pumps'}</div>
          <img src="${AUTHORIZED_SIGNATURE_BASE64}" class="signature-image" alt="Authorized Signature" />
          <div class="sign-title">${isMarathi ? 'स्वाक्षरी / Signature' : 'Authorized Signature'}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }
}
