import { db } from '../DatabaseService';
import {
  QuotationEntity,
  QuotationItemEntity,
  QuotationStatus,
} from '../../types/database';

export class QuotationRepository {
  public static async getAllQuotations(): Promise<QuotationEntity[]> {
    const bills = await db.getAll<QuotationEntity>('bills');
    const allItems = await db.getAll<QuotationItemEntity>('bill_items');

    const result = bills
      .map(b => {
        const qNumber =
          b.quotationNumber ||
          (b.billNumber?.startsWith('Q-')
            ? b.billNumber
            : `Q-${(b.billNumber || '1').padStart(3, '0')}`);
        const total = b.totalAmount || 0;
        const isPaid = b.paymentStatus === 'paid';
        const paid =
          typeof b.paidAmount === 'number'
            ? b.paidAmount
            : isPaid
            ? total
            : 0;
        const remaining =
          typeof b.remainingAmount === 'number'
            ? b.remainingAmount
            : isPaid
            ? 0
            : total;

        return {
          ...b,
          quotationNumber: qNumber,
          totalAmount: total,
          paymentStatus: (b.paymentStatus as any) || 'pending',
          paidAmount: paid,
          remainingAmount: remaining,
          status: (b.status as QuotationStatus) || 'saved',
          items: allItems.filter(item => item.billId === b.id),
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log('[QUOTATION][FETCH][RESPONSE]', result);
    return result;
  }

  public static async getQuotationById(id: string): Promise<QuotationEntity | null> {
    const bill = await db.getById<QuotationEntity>('bills', id);
    if (!bill) return null;

    const allItems = await db.getAll<QuotationItemEntity>('bill_items');
    const qNumber =
      bill.quotationNumber ||
      (bill.billNumber?.startsWith('Q-')
        ? bill.billNumber
        : `Q-${(bill.billNumber || '1').padStart(3, '0')}`);

    const total = bill.totalAmount || 0;
    const isPaid = bill.paymentStatus === 'paid';
    const paid =
      typeof bill.paidAmount === 'number'
        ? bill.paidAmount
        : isPaid
        ? total
        : 0;
    const remaining =
      typeof bill.remainingAmount === 'number'
        ? bill.remainingAmount
        : isPaid
        ? 0
        : total;

    const result: QuotationEntity = {
      ...bill,
      quotationNumber: qNumber,
      totalAmount: total,
      paymentStatus: (bill.paymentStatus as any) || 'pending',
      paidAmount: paid,
      remainingAmount: remaining,
      status: (bill.status as QuotationStatus) || 'saved',
      items: allItems.filter(item => item.billId === bill.id),
    };

    console.log('[QUOTATION][FETCH][RESPONSE]', result);
    return result;
  }

  public static async getNextQuotationNumber(): Promise<string> {
    const bills = await db.getAll<QuotationEntity>('bills');
    if (bills.length === 0) {
      return 'Q-001';
    }

    const numbers: number[] = [];
    for (const b of bills) {
      const target = b.quotationNumber || b.billNumber || '';
      if (target.startsWith('Q-')) {
        const numPart = parseInt(target.replace('Q-', ''), 10);
        if (!isNaN(numPart)) numbers.push(numPart);
      } else {
        const numPart = parseInt(target, 10);
        if (!isNaN(numPart)) numbers.push(numPart);
      }
    }

    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNum = maxNum + 1;
    return `Q-${nextNum.toString().padStart(3, '0')}`;
  }

  /**
   * ATOMIC TRANSACTION:
   * Saves Quotation -> Saves Quotation Items.
   * STRICTLY DOES NOT CREATE AN INVOICE.
   */
  public static async saveQuotation(
    quotation: QuotationEntity,
    items: QuotationItemEntity[],
  ): Promise<QuotationEntity> {
    return db.runTransaction(async () => {
      const paymentStatus = quotation.paymentStatus || 'pending';
      const totalAmount = quotation.totalAmount || 0;
      const paidAmount =
        typeof quotation.paidAmount === 'number'
          ? Math.round((Math.max(0, quotation.paidAmount) + Number.EPSILON) * 100) / 100
          : paymentStatus === 'paid'
          ? totalAmount
          : 0;
      const remainingAmount =
        typeof quotation.remainingAmount === 'number'
          ? Math.round((Math.max(0, quotation.remainingAmount) + Number.EPSILON) * 100) / 100
          : Math.round((Math.max(0, totalAmount - paidAmount) + Number.EPSILON) * 100) / 100;

      console.log('[PAYMENT][CALCULATION]', {
        totalAmount,
        paymentStatus,
        paidAmount,
        remainingAmount,
      });

      const quotationToSave: QuotationEntity = {
        ...quotation,
        totalAmount,
        paymentStatus,
        paidAmount,
        remainingAmount,
      };

      console.log('[QUOTATION][SAVE][REQUEST]', quotationToSave);

      // Check if updating existing or inserting new
      const existing = await db.getById<QuotationEntity>('bills', quotationToSave.id);

      if (existing) {
        // Delete existing items to replace with updated items
        const allItems = await db.getAll<QuotationItemEntity>('bill_items');
        for (const it of allItems) {
          if (it.billId === quotationToSave.id) {
            await db.delete('bill_items', it.id);
          }
        }

        console.log('========== BILL UPDATE REQUEST ==========');
        console.log('[BILL][UPDATE][REQUEST]', quotationToSave);

        const updateResult = await db.update<QuotationEntity>('bills', quotationToSave.id, quotationToSave);

        console.log('========== BILL UPDATE RESPONSE ==========');
        console.log('[BILL][UPDATE][RESPONSE]', updateResult);

        const updatedBill = await db.getById<QuotationEntity>('bills', quotationToSave.id);
        console.log('========== BILL UPDATE READ BACK ==========');
        console.log('[BILL][UPDATE][READBACK]', updatedBill);
      } else {
        console.log('========== BILL INSERT REQUEST ==========');
        console.log('[BILL][INSERT][REQUEST]', {
          id: quotationToSave.id,
          billNumber: quotationToSave.billNumber,
          quotationNumber: quotationToSave.quotationNumber,
          customerId: quotationToSave.customerId,
          customerName: quotationToSave.customerName,
          totalAmount: quotationToSave.totalAmount,
          paymentStatus: quotationToSave.paymentStatus,
          paidAmount: quotationToSave.paidAmount,
          remainingAmount: quotationToSave.remainingAmount,
        });

        const insertResult = await db.insert<QuotationEntity>('bills', quotationToSave);

        console.log('========== BILL INSERT RESPONSE ==========');
        console.log('[BILL][INSERT][RESPONSE]', insertResult);

        const storedBill = await db.getById<QuotationEntity>('bills', quotationToSave.id);
        console.log('========== BILL INSERT READ BACK ==========');
        console.log('[BILL][INSERT][READBACK]', storedBill);
      }

      await db.insertMany<QuotationItemEntity>('bill_items', items);

      const freshSaved = await QuotationRepository.getQuotationById(quotationToSave.id);
      console.log('[QUOTATION][SAVE][RESPONSE]', freshSaved);
      console.log('[QUOTATION][SAVE][READBACK]', freshSaved);

      return freshSaved || {
        ...quotationToSave,
        items,
      };
    });
  }

  public static async updateQuotationStatus(
    id: string,
    status: QuotationStatus,
  ): Promise<QuotationEntity | null> {
    return db.runTransaction(async () => {
      const existing = await db.getById<QuotationEntity>('bills', id);
      if (!existing) return null;

      const updated = await db.update<QuotationEntity>('bills', id, {
        status,
        updatedAt: new Date().toISOString(),
      });
      if (!updated) return null;

      const allItems = await db.getAll<QuotationItemEntity>('bill_items');
      return {
        ...updated,
        items: allItems.filter(item => item.billId === id),
      };
    });
  }

  public static async deleteQuotation(id: string): Promise<boolean> {
    return db.runTransaction(async () => {
      const allItems = await db.getAll<QuotationItemEntity>('bill_items');
      for (const item of allItems) {
        if (item.billId === id) {
          await db.delete('bill_items', item.id);
        }
      }
      return db.delete('bills', id);
    });
  }
}
