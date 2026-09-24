import { db } from '../DatabaseService';
import { IncomeEntity, ExpenseEntity } from '../../types/database';

export class FinancialRepository {
  // --- Income Operations ---
  public static async getAllIncome(): Promise<IncomeEntity[]> {
    const records = await db.getAll<IncomeEntity>('income');
    return records.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  public static async getIncomeById(id: string): Promise<IncomeEntity | null> {
    return db.getById<IncomeEntity>('income', id);
  }

  public static async addIncome(income: IncomeEntity): Promise<IncomeEntity> {
    return db.insert<IncomeEntity>('income', income);
  }

  public static async updateIncome(
    id: string,
    updates: Partial<IncomeEntity>,
  ): Promise<IncomeEntity | null> {
    return db.update<IncomeEntity>('income', id, updates);
  }

  public static async deleteIncome(id: string): Promise<boolean> {
    return db.delete('income', id);
  }

  // --- Expense / Outcome Operations ---
  public static async getAllExpenses(): Promise<ExpenseEntity[]> {
    const records = await db.getAll<ExpenseEntity>('expenses');
    return records.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  public static async getExpenseById(id: string): Promise<ExpenseEntity | null> {
    return db.getById<ExpenseEntity>('expenses', id);
  }

  public static async addExpense(expense: ExpenseEntity): Promise<ExpenseEntity> {
    return db.insert<ExpenseEntity>('expenses', expense);
  }

  public static async updateExpense(
    id: string,
    updates: Partial<ExpenseEntity>,
  ): Promise<ExpenseEntity | null> {
    return db.update<ExpenseEntity>('expenses', id, updates);
  }

  public static async deleteExpense(id: string): Promise<boolean> {
    return db.delete('expenses', id);
  }
}
