import { db } from '../DatabaseService';
import {
  BillEntity,
  BillItemEntity,
  InvoiceEntity,
  InvoiceItemEntity,
} from '../../types/database';

export class BillRepository {
  public static async getAllBills(): Promise<BillEntity[]> {
    const bills = await db.getAll<BillEntity>('bills');
    const allItems = await db.getAll<BillItemEntity>('bill_items');

    return bills
      .map(bill => ({
        ...bill,
        items: allItems.filter(item => item.billId === bill.id),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public static async getBillById(id: string): Promise<BillEntity | null> {
    const bill = await db.getById<BillEntity>('bills', id);
    if (!bill) return null;

    const allItems = await db.getAll<BillItemEntity>('bill_items');
    return {
      ...bill,
      items: allItems.filter(item => item.billId === bill.id),
    };
  }

  public static async getNextBillNumber(): Promise<string> {
    const bills = await db.getAll<BillEntity>('bills');
    const baseNumber = 167; // Starting default receipt number per business requirements
    if (bills.length === 0) {
      return baseNumber.toString();
    }

    const numericValues = bills
      .map(b => parseInt(b.billNumber, 10))
      .filter(n => !isNaN(n));

    if (numericValues.length === 0) return (baseNumber + bills.length).toString();
    const maxNum = Math.max(...numericValues, baseNumber - 1);
    return (maxNum + 1).toString();
  }

  public static async getNextInvoiceNumber(): Promise<string> {
    const invoices = await db.getAll<InvoiceEntity>('invoices');
    const currentYear = new Date().getFullYear();
    const prefix = `INV-${currentYear}-`;

    const seqs = invoices
      .map(inv => {
        if (inv.invoiceNumber.startsWith(prefix)) {
          const part = parseInt(inv.invoiceNumber.replace(prefix, ''), 10);
          return isNaN(part) ? 0 : part;
        }
        return 0;
      });

    const nextSeq = (Math.max(0, ...seqs) + 1).toString().padStart(4, '0');
    return `${prefix}${nextSeq}`;
  }

  /**
   * ATOMIC TRANSACTION:
   * Saves Bill -> Saves Bill Items -> Automatically generates and saves Invoice -> Saves Invoice Items
   * Guaranteed to succeed completely or roll back.
   */
  /**
   * ATOMIC TRANSACTION:
   * Saves Bill -> Saves Bill Items -> Automatically generates and saves Invoice -> Saves Invoice Items
   * Guaranteed to succeed completely or roll back.
   */
  public static async saveBillWithInvoice(
    bill: BillEntity,
    items: BillItemEntity[],
  ): Promise<{ bill: BillEntity; invoice: InvoiceEntity }> {
    return db.runTransaction(async () => {
      const paymentStatus = bill.paymentStatus || 'pending';
      const totalAmount = bill.totalAmount || 0;
      const paidAmount =
        typeof bill.paidAmount === 'number'
          ? Math.round((Math.max(0, bill.paidAmount) + Number.EPSILON) * 100) / 100
          : paymentStatus === 'paid'
          ? totalAmount
          : 0;
      const remainingAmount =
        typeof bill.remainingAmount === 'number'
          ? Math.round((Math.max(0, bill.remainingAmount) + Number.EPSILON) * 100) / 100
          : Math.round((Math.max(0, totalAmount - paidAmount) + Number.EPSILON) * 100) / 100;

      console.log('[PAYMENT][CALCULATION]', {
        totalAmount,
        paymentStatus,
        paidAmount,
        remainingAmount,
      });

      const billToSave: BillEntity = {
        ...bill,
        paymentStatus,
        paidAmount,
        remainingAmount,
      };

      console.log('========== BILL INSERT REQUEST ==========');
      console.log('[BILL][INSERT][REQUEST]', {
        id: billToSave.id,
        billNumber: billToSave.billNumber,
        quotationNumber: billToSave.quotationNumber,
        customerId: billToSave.customerId,
        customerName: billToSave.customerName,
        totalAmount: billToSave.totalAmount,
        paymentStatus: billToSave.paymentStatus,
        paidAmount: billToSave.paidAmount,
        remainingAmount: billToSave.remainingAmount,
      });

      // 1. Insert Bill
      const insertBillResult = await db.insert<BillEntity>('bills', billToSave);

      console.log('========== BILL INSERT RESPONSE ==========');
      console.log('[BILL][INSERT][RESPONSE]', insertBillResult);

      const storedBill = await db.getById<BillEntity>('bills', billToSave.id);
      console.log('========== BILL INSERT READ BACK ==========');
      console.log('[BILL][INSERT][READBACK]', storedBill);

      // 2. Insert Bill Items
      await db.insertMany<BillItemEntity>('bill_items', items);

      // 3. Generate Automatic Invoice
      const invoiceNumber = await BillRepository.getNextInvoiceNumber();
      const invoiceId = 'inv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

      const invoice: InvoiceEntity = {
        id: invoiceId,
        invoiceNumber,
        billId: bill.id,
        sourceQuotationId: bill.id,
        sourceQuotationNumber: bill.quotationNumber || bill.billNumber,
        customerId: bill.customerId || '',
        customerName: bill.customerName,
        customerPhone: bill.customerPhone || '',
        customerAddress: bill.customerAddress,
        date: bill.date,
        borewellDepth: bill.borewellDepth || 0,
        waterBearing: bill.waterBearing || 0,
        boreSize: bill.boreSize || 0,
        deliveryDays: bill.deliveryDays || 7,
        amountInWords: bill.amountInWords,
        amountInWordsMarathi: bill.amountInWordsMarathi,
        amountInWordsEnglish: bill.amountInWordsEnglish,
        subtotal: bill.totalAmount,
        taxAmount: 0,
        grandTotal: bill.totalAmount,
        paymentStatus,
        paidAmount,
        remainingAmount,
        notes: `Auto-generated from Quotation #${bill.billNumber}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const invoiceItems: InvoiceItemEntity[] = items.map(bi => ({
        id: 'inv_item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        invoiceId: invoice.id,
        srNo: bi.srNo,
        description: bi.particularsEn || bi.particularsMr,
        quantity: bi.quantity,
        rate: bi.rate,
        total: bi.total,
        particularsMr: bi.particularsMr,
        particularsEn: bi.particularsEn,
        itemSpecs: bi.itemSpecs,
      }));

      console.log('========== INVOICE INSERT REQUEST ==========');
      console.log('[INVOICE][INSERT][REQUEST]', {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        billId: invoice.billId,
        sourceQuotationId: invoice.sourceQuotationId,
        sourceQuotationNumber: invoice.sourceQuotationNumber,
        customerName: invoice.customerName,
        grandTotal: invoice.grandTotal,
        paymentStatus: invoice.paymentStatus,
        paidAmount: invoice.paidAmount,
        remainingAmount: invoice.remainingAmount,
      });

      // 4. Save Invoice and items
      const insertInvoiceResult = await db.insert<InvoiceEntity>('invoices', invoice);

      console.log('========== INVOICE INSERT RESPONSE ==========');
      console.log('[INVOICE][INSERT][RESPONSE]', insertInvoiceResult);

      const storedInvoice = await db.getById<InvoiceEntity>('invoices', invoice.id);
      console.log('========== INVOICE INSERT READ BACK ==========');
      console.log('[INVOICE][INSERT][READBACK]', storedInvoice);

      await db.insertMany<InvoiceItemEntity>('invoice_items', invoiceItems);

      return {
        bill: { ...(storedBill || billToSave), items },
        invoice: { ...(storedInvoice || invoice), items: invoiceItems },
      };
    });
  }

  public static async updateBill(
    id: string,
    updatePayload: Partial<BillEntity>,
  ): Promise<BillEntity | null> {
    console.log('========== BILL UPDATE REQUEST ==========');
    console.log('[BILL][UPDATE][REQUEST]', updatePayload);

    const result = await db.update<BillEntity>('bills', id, updatePayload);

    console.log('========== BILL UPDATE RESPONSE ==========');
    console.log('[BILL][UPDATE][RESPONSE]', result);

    const updatedBill = await db.getById<BillEntity>('bills', id);
    console.log('========== BILL UPDATE READ BACK ==========');
    console.log('[BILL][UPDATE][READBACK]', updatedBill);

    return updatedBill;
  }

  public static async deleteBill(id: string): Promise<boolean> {
    return db.runTransaction(async () => {
      const allItems = await db.getAll<BillItemEntity>('bill_items');
      for (const item of allItems) {
        if (item.billId === id) {
          await db.delete('bill_items', item.id);
        }
      }
      return db.delete('bills', id);
    });
  }
}
