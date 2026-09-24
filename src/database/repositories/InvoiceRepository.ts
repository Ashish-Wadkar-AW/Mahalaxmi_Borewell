import { db } from '../DatabaseService';
import { InvoiceEntity, InvoiceItemEntity, QuotationEntity } from '../../types/database';

export class InvoiceRepository {
  public static async getAllInvoices(): Promise<InvoiceEntity[]> {
    const invoices = await db.getAll<InvoiceEntity>('invoices');
    const allItems = await db.getAll<InvoiceItemEntity>('invoice_items');

    const result = invoices
      .map(inv => {
        const isPaid = inv.paymentStatus === 'paid';
        const total = inv.grandTotal || 0;
        return {
          ...inv,
          customerPhone: inv.customerPhone || '',
          paidAmount:
            typeof inv.paidAmount === 'number'
              ? inv.paidAmount
              : isPaid
              ? total
              : 0,
          remainingAmount:
            typeof inv.remainingAmount === 'number'
              ? inv.remainingAmount
              : isPaid
              ? 0
              : total,
          items: allItems.filter(item => item.invoiceId === inv.id),
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log('[INVOICE][FETCH][RESPONSE]', result);
    return result;
  }

  public static async getInvoiceById(id: string): Promise<InvoiceEntity | null> {
    const inv = await db.getById<InvoiceEntity>('invoices', id);
    if (!inv) return null;

    const allItems = await db.getAll<InvoiceItemEntity>('invoice_items');
    const isPaid = inv.paymentStatus === 'paid';
    const total = inv.grandTotal || 0;
    const result: InvoiceEntity = {
      ...inv,
      customerPhone: inv.customerPhone || '',
      paidAmount:
        typeof inv.paidAmount === 'number'
          ? inv.paidAmount
          : isPaid
          ? total
          : 0,
      remainingAmount:
        typeof inv.remainingAmount === 'number'
          ? inv.remainingAmount
          : isPaid
          ? 0
          : total,
      items: allItems.filter(item => item.invoiceId === inv.id),
    };

    console.log('[INVOICE][FETCH][RESPONSE]', result);
    return result;
  }

  public static async updatePaymentStatus(
    id: string,
    paymentStatus: 'pending' | 'paid' | 'partial',
    paidAmount?: number,
    remainingAmount?: number,
  ): Promise<InvoiceEntity | null> {
    const inv = await db.getById<InvoiceEntity>('invoices', id);
    if (!inv) return null;

    let computedPaid = paidAmount;
    let computedRemaining = remainingAmount;

    if (computedPaid === undefined) {
      if (paymentStatus === 'paid') {
        computedPaid = inv.grandTotal;
        computedRemaining = 0;
      } else if (paymentStatus === 'pending') {
        computedPaid = 0;
        computedRemaining = inv.grandTotal;
      } else {
        computedPaid = inv.paidAmount || 0;
        computedRemaining = Math.max(0, inv.grandTotal - computedPaid);
      }
    } else {
      if (computedRemaining === undefined) {
        computedRemaining = Math.max(0, inv.grandTotal - computedPaid);
      }
    }

    const normalizedPaid = Math.round((Math.max(0, computedPaid) + Number.EPSILON) * 100) / 100;
    const normalizedRemaining = Math.round((Math.max(0, computedRemaining) + Number.EPSILON) * 100) / 100;

    console.log('[PAYMENT][CALCULATION]', {
      totalAmount: inv.grandTotal,
      paymentStatus,
      paidAmount: normalizedPaid,
      remainingAmount: normalizedRemaining,
    });

    const updatePayload = {
      paymentStatus,
      paidAmount: normalizedPaid,
      remainingAmount: normalizedRemaining,
    };

    console.log('========== INVOICE PAYMENT UPDATE REQUEST ==========');
    console.log('[INVOICE][UPDATE][REQUEST]', updatePayload);

    const result = await db.update<InvoiceEntity>('invoices', id, updatePayload);

    console.log('========== INVOICE PAYMENT UPDATE RESPONSE ==========');
    console.log('[INVOICE][UPDATE][RESPONSE]', result);

    const updatedInvoice = await InvoiceRepository.getInvoiceById(id);
    console.log('========== INVOICE PAYMENT READ BACK ==========');
    console.log('[INVOICE][UPDATE][READBACK]', updatedInvoice);

    return updatedInvoice;
  }

  public static async getNextInvoiceNumber(): Promise<string> {
    const invoices = await db.getAll<InvoiceEntity>('invoices');
    const currentYear = new Date().getFullYear();
    const prefix = `INV-${currentYear}-`;

    const seqs = invoices.map(inv => {
      if (inv.invoiceNumber && inv.invoiceNumber.startsWith(prefix)) {
        const part = parseInt(inv.invoiceNumber.replace(prefix, ''), 10);
        return isNaN(part) ? 0 : part;
      }
      return 0;
    });

    const nextSeq = (Math.max(0, ...seqs) + 1).toString().padStart(4, '0');
    return `${prefix}${nextSeq}`;
  }

  public static async getInvoiceBySourceQuotationId(
    quotationId: string,
  ): Promise<InvoiceEntity | null> {
    const invoices = await db.getAll<InvoiceEntity>('invoices');
    const found = invoices.find(
      inv => inv.sourceQuotationId === quotationId || inv.billId === quotationId,
    );
    if (!found) return null;
    return InvoiceRepository.getInvoiceById(found.id);
  }

  /**
   * ATOMIC TRANSACTION:
   * 1. Inserts Invoice with independent copied data.
   * 2. Inserts Invoice Items with independent copied details/specs.
   * 3. Updates Source Quotation status to 'invoiced'.
   */
  public static async createInvoiceFromQuotation(
    quotationId: string,
    invoiceData: Omit<InvoiceEntity, 'id'>,
    items: Omit<InvoiceItemEntity, 'id' | 'invoiceId'>[],
  ): Promise<InvoiceEntity> {
    return db.runTransaction(async () => {
      // Prevent duplicate invoice creation
      const existing = await InvoiceRepository.getInvoiceBySourceQuotationId(quotationId);
      if (existing) {
        throw new Error(`Quotation already converted to Invoice #${existing.invoiceNumber}`);
      }

      const invoiceId =
        'inv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

      const paymentStatus = invoiceData.paymentStatus || 'pending';
      const grandTotal = invoiceData.grandTotal || 0;
      const paidAmount =
        typeof invoiceData.paidAmount === 'number'
          ? Math.round((Math.max(0, invoiceData.paidAmount) + Number.EPSILON) * 100) / 100
          : paymentStatus === 'paid'
          ? grandTotal
          : 0;
      const remainingAmount =
        typeof invoiceData.remainingAmount === 'number'
          ? Math.round((Math.max(0, invoiceData.remainingAmount) + Number.EPSILON) * 100) / 100
          : Math.round((Math.max(0, grandTotal - paidAmount) + Number.EPSILON) * 100) / 100;

      console.log('[PAYMENT][CALCULATION]', {
        totalAmount: grandTotal,
        paymentStatus,
        paidAmount,
        remainingAmount,
      });

      const fullInvoice: InvoiceEntity = {
        ...invoiceData,
        id: invoiceId,
        billId: quotationId,
        sourceQuotationId: quotationId,
        paymentStatus,
        paidAmount,
        remainingAmount,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log('========== INVOICE INSERT REQUEST ==========');
      console.log('[INVOICE][INSERT][REQUEST]', {
        id: fullInvoice.id,
        invoiceNumber: fullInvoice.invoiceNumber,
        billId: fullInvoice.billId,
        sourceQuotationId: fullInvoice.sourceQuotationId,
        sourceQuotationNumber: fullInvoice.sourceQuotationNumber,
        customerName: fullInvoice.customerName,
        grandTotal: fullInvoice.grandTotal,
        paymentStatus: fullInvoice.paymentStatus,
        paidAmount: fullInvoice.paidAmount,
        remainingAmount: fullInvoice.remainingAmount,
      });

      const insertResult = await db.insert<InvoiceEntity>('invoices', fullInvoice);

      console.log('========== INVOICE INSERT RESPONSE ==========');
      console.log('[INVOICE][INSERT][RESPONSE]', insertResult);

      const storedInvoice = await db.getById<InvoiceEntity>('invoices', fullInvoice.id);
      console.log('========== INVOICE INSERT READ BACK ==========');
      console.log('[INVOICE][INSERT][READBACK]', storedInvoice);

      const invoiceItems: InvoiceItemEntity[] = items.map(item => ({
        ...item,
        id: 'inv_item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        invoiceId,
      }));

      await db.insertMany<InvoiceItemEntity>('invoice_items', invoiceItems);

      // Update Quotation Status to 'invoiced'
      try {
        await db.update<QuotationEntity>('bills', quotationId, {
          status: 'invoiced',
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Could not update source quotation status:', e);
      }

      return {
        ...(storedInvoice || fullInvoice),
        items: invoiceItems,
      };
    });
  }

  public static async deleteInvoice(id: string): Promise<boolean> {
    return db.runTransaction(async () => {
      const allItems = await db.getAll<InvoiceItemEntity>('invoice_items');
      for (const item of allItems) {
        if (item.invoiceId === id) {
          await db.delete('invoice_items', item.id);
        }
      }
      return db.delete('invoices', id);
    });
  }
}
