import { NativeModules, Platform } from 'react-native';
import { QuotationEntity } from '../types/database';
import { CalculationService } from './CalculationService';
import { formatParticularsText, numberToWordsMarathi } from '../utils/quotationFormatters';
import { LOGO_QUOTATION_BASE64 } from '../assets/images/logoBase64';
import {
  OFFICIAL_STAMP_BASE64,
  AUTHORIZED_SIGNATURE_BASE64,
} from '../assets/images/stampSignatureBase64';

const getPdfModule = () => NativeModules.PdfModule;

export interface GeneratePdfResult {
  success: boolean;
  uri: string;
  filePath: string;
  fileName: string;
  generatedPath?: string;
  pageCount?: number;
  contentHeight?: number;
  contentWidth?: number;
  tableWidth?: number;
}

export interface ExistingPdfResult {
  exists: boolean;
  uri?: string;
  filePath?: string;
  fileName?: string;
}

export class QuotationPdfService {
  /**
   * Generates a high-fidelity PDF from the quotation data matching QuotationDocumentView.
   */
  public static async generateQuotationPdf(
    quotation: QuotationEntity,
    language: 'mr' | 'en' = 'mr',
  ): Promise<GeneratePdfResult> {
    const totalStart = Date.now();
    const quotationId = quotation.id;
    const quotationNumber = quotation.quotationNumber || quotation.billNumber || 'Q-001';

    console.log('[QUOTATION][PDF][START]', {
      quotationId,
      quotationNumber,
      timestamp: new Date().toISOString(),
    });

    try {
      // 1. Data Preparation Step
      const dataStart = Date.now();
      const items = quotation.items || [];
      const grandTotal = quotation.totalAmount || 0;

      const vehicleText = [
        quotation.vehicleNumber || quotation.vehicle,
        quotation.vehicleType,
        quotation.vehicleDetails,
      ]
        .filter(Boolean)
        .join(' - ');

      console.log('[QUOTATION][PDF][VEHICLE_DATA]', {
        hasVehicle: Boolean(vehicleText),
        vehicleText: vehicleText || 'None',
        vehicleNumber: quotation.vehicleNumber || quotation.vehicle || null,
        vehicleType: quotation.vehicleType || null,
        vehicleDetails: quotation.vehicleDetails || null,
        hasLogoVehicle: true,
      });

      console.log('[QUOTATION][PDF][DATA]', {
        quotationId,
        quotationNumber,
        customerName: quotation.customerName,
        customerAddress: quotation.customerAddress,
        customerPhone: quotation.customerPhone,
        date: quotation.date,
        borewellDepth: quotation.borewellDepth,
        waterBearing: quotation.waterBearing,
        boreSize: quotation.boreSize,
        deliveryDays: quotation.deliveryDays,
        itemsCount: items.length,
        grandTotal,
        paymentStatus: quotation.paymentStatus,
        paidAmount: quotation.paidAmount,
        remainingAmount: quotation.remainingAmount,
        vehicleText: vehicleText || 'None',
      });

      const dataElapsed = Date.now() - dataStart;
      console.log(`[QUOTATION][PDF][DATA_READY] elapsedMs=${dataElapsed}`, {
        quotationId,
        quotationNumber,
        itemsCount: items.length,
        grandTotal,
      });

      // 2. Asset Verification & HTML Generation Step
      console.log('[QUOTATION][PDF][STAMP][START]');
      console.log('[QUOTATION][PDF][STAMP][READY]', {
        loaded: Boolean(OFFICIAL_STAMP_BASE64),
        dataLength: OFFICIAL_STAMP_BASE64.length,
      });

      console.log('[QUOTATION][PDF][SIGNATURE][START]');
      console.log('[QUOTATION][PDF][SIGNATURE][READY]', {
        loaded: Boolean(AUTHORIZED_SIGNATURE_BASE64),
        dataLength: AUTHORIZED_SIGNATURE_BASE64.length,
      });

      const htmlStart = Date.now();
      const html = this.buildQuotationHtml(quotation, language);
      const cleanQNumber = quotationNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `Quotation_${cleanQNumber}.pdf`;
      const htmlElapsed = Date.now() - htmlStart;
      console.log(`[QUOTATION][PDF][HTML_READY] elapsedMs=${htmlElapsed}`, {
        fileName,
        htmlLength: html.length,
      });

      // 3. PDF Native Engine Invocation
      const pdfModule = getPdfModule();
      if (!pdfModule || typeof pdfModule.generatePdfFromHtml !== 'function') {
        const err = new Error(
          'Native PDF engine is not available. Please rebuild the Android application (npm run android) to load native modules.',
        );
        console.error('[QUOTATION][PDF][ERROR]', {
          quotationId,
          step: 'ENGINE_CHECK',
          error: err.message,
        });
        throw err;
      }

      const generateStart = Date.now();
      console.log('[QUOTATION][PDF][GENERATE]', {
        fileName,
        quotationNumber,
        htmlLength: html.length,
      });

      // Wrap in 15-second timeout race
      const timeoutMs = 15000;
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          console.error(`[QUOTATION][PDF][ERROR] PDF generation timed out after ${timeoutMs}ms`);
          reject(new Error(`PDF generation timed out after ${timeoutMs / 1000} seconds.`));
        }, timeoutMs);
      });

      const generatePromise = pdfModule.generatePdfFromHtml(html, fileName);

      let result: GeneratePdfResult;
      try {
        result = await Promise.race([generatePromise, timeoutPromise]);
      } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
      }

      const generateElapsed = Date.now() - generateStart;
      console.log(`[QUOTATION][PDF][GENERATE_SUCCESS] elapsedMs=${generateElapsed}`, {
        fileName: result.fileName,
      });
      console.log(`[QUOTATION][PDF][PAGE_COUNT] ${result.pageCount || 1}`);
      console.log('[QUOTATION][PDF][PAGE_SIZE] A4 portrait (210mm x 297mm, 794px x 1123px)');
      console.log(`[QUOTATION][PDF][CONTENT_WIDTH] ${result.contentWidth || 794}px`);
      console.log(`[QUOTATION][PDF][CONTENT_HEIGHT] ${result.contentHeight || 650}px`);
      console.log(`[QUOTATION][PDF][TABLE_WIDTH] ${result.tableWidth || 730}px`);
      console.log('[QUOTATION][PDF][GENERATED_PATH]', result.generatedPath || result.filePath);
      console.log('[QUOTATION][PDF][DOWNLOAD_PATH]', result.filePath);

      // 4. Downloads Saving Verification
      const downloadStart = Date.now();
      console.log('[QUOTATION][PDF][DOWNLOAD_START]', {
        targetFile: result.fileName,
        targetPath: result.filePath,
      });
      const downloadElapsed = Date.now() - downloadStart;
      console.log(`[QUOTATION][PDF][DOWNLOAD_SUCCESS] elapsedMs=${downloadElapsed}`, {
        uri: result.uri,
        filePath: result.filePath,
      });

      // 5. Verification Step
      const verifyStart = Date.now();
      const targetUriOrPath = result.uri || result.filePath;
      console.log('[QUOTATION][PDF][VERIFY]', { targetUriOrPath });

      const exists = await this.checkFileExists(targetUriOrPath);
      const verifyElapsed = Date.now() - verifyStart;

      if (!exists) {
        const err = new Error('PDF was generated but could not be verified in Downloads folder.');
        console.error('[QUOTATION][PDF][ERROR]', {
          step: 'VERIFICATION',
          error: err.message,
          targetUriOrPath,
        });
        throw err;
      }

      console.log(`[QUOTATION][PDF][VERIFY_SUCCESS] elapsedMs=${verifyElapsed}`, {
        targetUriOrPath,
        exists,
      });

      console.log('[QUOTATION][PDF][SAVED]', {
        uri: result.uri,
        filePath: result.filePath,
        fileName: result.fileName,
        pageCount: result.pageCount || 1,
        totalElapsedMs: Date.now() - totalStart,
      });

      return result;
    } catch (error: any) {
      console.error('[QUOTATION][PDF][ERROR]', {
        quotationId,
        quotationNumber,
        error: error?.message || String(error),
        totalElapsedMs: Date.now() - totalStart,
      });
      throw error;
    }
  }

  /**
   * Checks whether a quotation PDF already exists in the Downloads folder.
   */
  public static async findExistingPdf(quotationNumber: string): Promise<ExistingPdfResult> {
    const pdfModule = getPdfModule();
    if (!pdfModule || typeof pdfModule.findExistingPdf !== 'function') {
      return { exists: false };
    }
    try {
      const cleanQNumber = quotationNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `Quotation_${cleanQNumber}.pdf`;
      return await pdfModule.findExistingPdf(fileName);
    } catch (_: any) {
      return { exists: false };
    }
  }

  /**
   * Verifies that the saved PDF file exists in storage.
   */
  public static async checkFileExists(uriOrPath: string): Promise<boolean> {
    const pdfModule = getPdfModule();
    if (pdfModule?.checkFileExists) {
      try {
        return await pdfModule.checkFileExists(uriOrPath);
      } catch (_: any) {
        return false;
      }
    }
    return false;
  }

  /**
   * Opens the generated PDF using the device's native PDF viewer.
   */
  public static async openPdf(savedPdfUri: string): Promise<boolean> {
    console.log('[QUOTATION][PDF][VIEW]', { uri: savedPdfUri });

    const pdfModule = getPdfModule();
    if (!pdfModule || typeof pdfModule.openPdf !== 'function') {
      const err = new Error('No PDF viewer is available on this device.');
      console.error('[QUOTATION][PDF][ERROR]', {
        step: 'VIEW_CHECK',
        error: err.message,
      });
      throw err;
    }

    try {
      return await pdfModule.openPdf(savedPdfUri);
    } catch (error: any) {
      console.error('[QUOTATION][PDF][ERROR]', {
        step: 'VIEW_EXECUTE',
        error: error?.message || String(error),
      });
      throw error;
    }
  }

  /**
   * Constructs the HTML document styled to match QuotationDocumentView.
   */
  private static buildQuotationHtml(quotation: QuotationEntity, language: 'mr' | 'en'): string {
    const isMarathi = language === 'mr';
    const qNumber = quotation.quotationNumber || quotation.billNumber || 'Q-001';
    const grandTotal = quotation.totalAmount || 0;
    const { rupees, paise } = CalculationService.splitRupeesAndPaise(grandTotal);

    const displayWords =
      quotation.amountInWordsMarathi ||
      quotation.amountInWords ||
      (isMarathi ? numberToWordsMarathi(grandTotal) : CalculationService.numberToWordsIndian(grandTotal));

    const items = quotation.items || [];
    const borewellDepth = quotation.borewellDepth || '0';
    const waterBearing = quotation.waterBearing || '0';
    const boreSize = quotation.boreSize || '0';
    const deliveryDays = quotation.deliveryDays || '7';

    const vehicleText = [
      quotation.vehicleNumber || quotation.vehicle,
      quotation.vehicleType,
      quotation.vehicleDetails,
    ]
      .filter(Boolean)
      .join(' - ');

    const paymentStatus = quotation.paymentStatus || 'pending';
    const paidAmount =
      typeof quotation.paidAmount === 'number'
        ? quotation.paidAmount
        : paymentStatus === 'paid'
          ? grandTotal
          : 0;
    const remainingAmount =
      typeof quotation.remainingAmount === 'number'
        ? quotation.remainingAmount
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
    const rowsHtml = items
      .map((item, index) => {
        let specs: Record<string, any> = {};
        if (typeof item.itemSpecs === 'string') {
          try {
            specs = JSON.parse(item.itemSpecs);
          } catch { }
        } else if (item.itemSpecs && typeof item.itemSpecs === 'object') {
          specs = item.itemSpecs;
        } else if ((item as any).specs && typeof (item as any).specs === 'object') {
          specs = (item as any).specs;
        }

        const formatted = formatParticularsText(item.srNo, specs, language);
        const lineSplit = CalculationService.splitRupeesAndPaise(item.total);
        const hasRate = Number(item.rate) > 0;
        const hasQty = Number(item.quantity) > 0;
        const isAlt = index % 2 === 1;

        const rowTitle = isMarathi
          ? item.particularsMr || formatted.title
          : item.particularsEn || formatted.title;

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
              ${item.total > 0
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
  <title>Quotation ${qNumber}</title>
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
      padding: 10px 18px; /* Left & right margin ensures complete right-side visibility */
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
      margin-bottom: 2px;
    }
    .banner-main-title {
      font-size: 17px;
      font-weight: 900;
      letter-spacing: 0.4px;
    }
    .banner-sub-title {
      font-size: 10px;
      font-weight: 700;
      opacity: 0.95;
    }
    .address-text {
      font-size: 9px;
      color: #4A3E38;
      font-weight: 700;
      margin-top: 1px;
    }
    .phone-text {
      font-size: 9.5px;
      color: #7A1C1C;
      font-weight: 800;
      margin-top: 1px;
    }
    .metadata-box {
      background-color: #FFFFFF;
      border: 1px solid #D4C6AB;
      border-radius: 4px;
      padding: 5px 8px;
      margin-bottom: 5px;
      box-sizing: border-box;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .meta-top-row {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dashed #E2D7C3;
      padding-bottom: 3px;
      margin-bottom: 3px;
    }
    .quote-no {
      font-size: 11.5px;
      font-weight: 800;
      color: #7A1C1C;
    }
    .quote-date {
      font-size: 10px;
      font-weight: 700;
      color: #4A3E38;
    }
    .field-row {
      display: flex;
      align-items: center;
      margin-bottom: 2px;
    }
    .field-label {
      width: 75px;
      font-weight: 700;
      color: #7A1C1C;
      font-size: 9.5px;
      flex-shrink: 0;
    }
    .field-val {
      flex: 1;
      font-weight: 700;
      color: #1A1412;
      border-bottom: 1px dotted #D4C6AB;
      font-size: 9.5px;
      padding-bottom: 1px;
    }
    .specs-box {
      display: flex;
      justify-content: space-between;
      background-color: #FFFFFF;
      border: 1px solid #D4C6AB;
      border-radius: 4px;
      padding: 4px 8px;
      margin-bottom: 5px;
      box-sizing: border-box;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .spec-item {
      font-size: 9.5px;
      font-weight: 700;
      color: #332A24;
    }
    .spec-item span {
      color: #7A1C1C;
      font-weight: 800;
    }
    .doc-title-row {
      text-align: center;
      margin: 3px 0;
    }
    .doc-title-badge {
      display: inline-block;
      border: 1.5px solid #7A1C1C;
      background-color: #FFFFFF;
      color: #7A1C1C;
      font-weight: 900;
      font-size: 10.5px;
      padding: 2px 14px;
      border-radius: 10px;
      letter-spacing: 0.5px;
    }
    table {
      width: 100%;
      max-width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
      margin-bottom: 5px;
      background-color: #FFFFFF;
      border: 1.5px solid #7A1C1C;
      box-sizing: border-box;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    th {
      background-color: #7A1C1C;
      color: #FFFFFF;
      font-weight: 800;
      font-size: 9.5px;
      padding: 3.5px 4px;
      text-align: center;
      border: 1px solid #5A1414;
      box-sizing: border-box;
    }
    td {
      padding: 3px 4px;
      border: 1px solid #E2D7C3;
      vertical-align: middle;
      font-size: 9.5px;
      box-sizing: border-box;
    }
    .alt-row {
      background-color: #FAF7F0;
    }
    .col-sr { width: 5.5%; text-align: center; font-weight: 700; white-space: nowrap; }
    .col-particulars { width: 49.5%; text-align: left; padding-left: 6px; word-break: break-word; }
    .col-qty { width: 8%; text-align: center; font-weight: 700; white-space: nowrap; }
    .col-rate { width: 17%; text-align: right; padding-right: 8px; white-space: nowrap; }
    .col-total { width: 20%; text-align: right; font-weight: 800; color: #1A1412; padding-right: 10px; white-space: nowrap; }
    .part-title { font-weight: 700; color: #1A1412; font-size: 9.5px; }
    .part-subtitle { font-size: 8.5px; color: #7A1C1C; margin-top: 1px; font-weight: 700; }
    .paise { font-size: 8.5px; color: #554B42; }
    .grand-total-row {
      background-color: #FAF7F0;
      font-weight: 900;
    }
    .grand-total-label {
      text-align: right;
      font-size: 11px;
      font-weight: 900;
      color: #7A1C1C;
      padding-right: 12px;
      white-space: nowrap;
      border-top: 1.5px solid #7A1C1C;
    }
    .grand-total-val {
      text-align: right;
      font-size: 12px;
      font-weight: 900;
      color: #7A1C1C;
      padding-right: 10px;
      white-space: nowrap;
      border-top: 1.5px solid #7A1C1C;
    }
    .words-box {
      width: 100%;
      background-color: #FFFFFF;
      border: 1px solid #D4C6AB;
      border-radius: 4px;
      padding: 3px 6px;
      margin-bottom: 4px;
      font-size: 9.5px;
      box-sizing: border-box;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .words-label {
      font-weight: 800;
      color: #7A1C1C;
    }
    .words-val {
      font-weight: 700;
      color: #2F855A;
      margin-left: 4px;
    }
    .delivery-box {
      font-size: 9px;
      font-weight: 700;
      color: #332A24;
      margin-bottom: 4px;
    }
    .delivery-box span {
      color: #C53030;
      font-weight: 800;
    }
    .payment-summary {
      width: 100%;
      display: flex;
      justify-content: space-between;
      background-color: #FFFFFF;
      border: 1px solid #D4C6AB;
      border-radius: 4px;
      padding: 4px 8px;
      margin-bottom: 4px;
      box-sizing: border-box;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .pay-col {
      text-align: center;
      flex: 1;
    }
    .pay-label {
      font-size: 8.5px;
      font-weight: 700;
      color: #554B42;
    }
    .pay-val {
      font-size: 10px;
      font-weight: 800;
      margin-top: 1px;
    }
    .pay-status { color: #2F855A; }
    .pay-paid { color: #2F855A; }
    .pay-rem { color: #C53030; }
    .terms-box {
      width: 100%;
      border: 1px solid #D4C6AB;
      background-color: #FFFFFF;
      border-radius: 4px;
      padding: 4px 6px;
      margin-bottom: 4px;
      box-sizing: border-box;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .terms-header {
      font-weight: 800;
      color: #7A1C1C;
      font-size: 9px;
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
          <div class="quote-no">${isMarathi ? 'कोटेशन नं. :' : 'Quotation No. :'} ${qNumber}</div>
          <div class="quote-date">${isMarathi ? 'दिनांक :' : 'Date :'} ${quotation.date || '-'}</div>
        </div>
        <div class="field-row">
          <div class="field-label">${isMarathi ? 'नांव :' : 'Name :'}</div>
          <div class="field-val">${quotation.customerName || '-'}</div>
        </div>
        <div class="field-row">
          <div class="field-label">${isMarathi ? 'पत्ता :' : 'Address :'}</div>
          <div class="field-val">${quotation.customerAddress || '-'}</div>
        </div>
        ${quotation.customerPhone
        ? `<div class="field-row">
                <div class="field-label">${isMarathi ? 'फोन नंबर :' : 'Phone :'}</div>
                <div class="field-val">${quotation.customerPhone}</div>
              </div>`
        : ''
      }
        ${vehicleText
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
        <div class="doc-title-badge">${isMarathi ? 'कोटेशन (QUOTATION)' : 'QUOTATION'}</div>
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
        <div class="term-item">6. ${isMarathi ? 'वरील कोटेशनमध्ये नमूद केलेल्या तपशीलापेक्षा (इस्टिमेटपेक्षा) जादा मटेरिअल लागल्यास पार्टीला ते रोखीने खरेदी करावे लागेल.' : 'If extra materials are required beyond the estimate provided in the quotation, the client must purchase them in cash.'}</div>
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
