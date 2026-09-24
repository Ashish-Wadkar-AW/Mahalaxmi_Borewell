import { db } from '../database/DatabaseService';

export interface ApplicationBackup {
  backupVersion: number;
  appVersion: string;
  createdAt: string;
  appName: string;
  data: {
    customers: any[];
    bills: any[];
    billItems: any[];
    invoices: any[];
    invoiceItems: any[];
    income: any[];
    expenses: any[];
    reminders: any[];
    profile: any[];
    settings: any[];
  };
}

export class BackupService {
  public static readonly BACKUP_VERSION = 1;
  public static readonly APP_VERSION = '1.0.0';

  /**
   * Generates a validated, structured JSON backup string.
   * STRICTLY EXCLUDES sensitive password hashes and active session tokens.
   */
  public static async createBackup(): Promise<string> {
    const rawData = await db.exportAllData();

    const backupPayload: ApplicationBackup = {
      backupVersion: BackupService.BACKUP_VERSION,
      appVersion: BackupService.APP_VERSION,
      createdAt: new Date().toISOString(),
      appName: 'Mahalaxmi Borewell Financial Management',
      data: {
        customers: rawData.customers || [],
        bills: rawData.bills || [],
        billItems: rawData.bill_items || [],
        invoices: rawData.invoices || [],
        invoiceItems: rawData.invoice_items || [],
        income: rawData.income || [],
        expenses: rawData.expenses || [],
        reminders: rawData.reminders || [],
        profile: rawData.profile || [],
        settings: (rawData.settings || []).filter(
          (s: any) => s.key !== 'session_token' && s.key !== 'secret_key',
        ),
      },
    };

    return JSON.stringify(backupPayload, null, 2);
  }

  /**
   * Validates a backup JSON string
   */
  public static validateBackup(jsonString: string): {
    isValid: boolean;
    error?: string;
    parsed?: ApplicationBackup;
  } {
    try {
      const parsed = JSON.parse(jsonString) as ApplicationBackup;

      if (!parsed.backupVersion || typeof parsed.backupVersion !== 'number') {
        return { isValid: false, error: 'Invalid backup file: missing backupVersion.' };
      }

      if (!parsed.data || typeof parsed.data !== 'object') {
        return { isValid: false, error: 'Invalid backup file: missing data object.' };
      }

      // Check required entity arrays
      const requiredArrays = [
        'bills',
        'billItems',
        'invoices',
        'income',
        'expenses',
        'reminders',
      ];
      for (const field of requiredArrays) {
        if (!Array.isArray((parsed.data as any)[field])) {
          return {
            isValid: false,
            error: `Invalid backup format: data.${field} must be an array.`,
          };
        }
      }

      return { isValid: true, parsed };
    } catch (e: any) {
      return { isValid: false, error: 'Malformed JSON. Unable to parse backup.' };
    }
  }

  /**
   * Restores data inside an atomic database transaction
   */
  public static async restoreBackup(backup: ApplicationBackup): Promise<boolean> {
    const tableData: Record<string, any[]> = {
      customers: backup.data.customers || [],
      bills: backup.data.bills || [],
      bill_items: backup.data.billItems || [],
      invoices: backup.data.invoices || [],
      invoice_items: backup.data.invoiceItems || [],
      income: backup.data.income || [],
      expenses: backup.data.expenses || [],
      reminders: backup.data.reminders || [],
      profile: backup.data.profile || [],
      settings: backup.data.settings || [],
    };

    await db.importAllData(tableData);
    return true;
  }
}
