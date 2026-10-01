import AsyncStorage from '@react-native-async-storage/async-storage';
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from './schema';

export interface QueryResult<T = any> {
  rows: T[];
  insertId?: number | string;
  rowsAffected: number;
}

/**
 * Robust, persistent offline-first DatabaseService.
 * Uses native SQLite as the primary source of truth.
 * Ensures consistent persistent storage across app restarts and Metro reloads.
 */
class DatabaseService {
  private static instance: DatabaseService;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private sqliteDb: any = null;
  private isUsingNativeSQLite = false;
  private dbPath: string = '';

  // Cached table columns map: table name -> Set of lowercase column names
  private tableColumns: Map<string, Set<string>> = new Map();

  private memoryStore: Record<string, any[]> = {
    users: [],
    customers: [],
    bills: [],
    bill_items: [],
    invoices: [],
    invoice_items: [],
    income: [],
    expenses: [],
    reminders: [],
    profile: [],
    settings: [],
  };

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Safe, idempotent initialization with a single shared promise.
   * Multiple simultaneous calls await the same initialization.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        console.log('[DB][STARTUP][OPEN]');

        // Try initializing native SQLite if available
        try {
          const opSqlite = require('@op-engineering/op-sqlite');
          if (opSqlite && typeof opSqlite.open === 'function') {
            // Stable persistent database name
            this.sqliteDb = opSqlite.open({ name: 'mahalaxmi_borewell.db' });
            this.isUsingNativeSQLite = true;

            try {
              this.dbPath =
                typeof this.sqliteDb.getDbPath === 'function'
                  ? this.sqliteDb.getDbPath()
                  : 'mahalaxmi_borewell.db';
            } catch {
              this.dbPath = 'mahalaxmi_borewell.db';
            }
          }
        } catch (sqliteErr) {
          console.warn('[DB] Native SQLite load notice:', sqliteErr);
          this.isUsingNativeSQLite = false;
          this.sqliteDb = null;
        }

        console.log('[DB][STARTUP][PATH]', this.dbPath || 'in-memory/storage');

        // Check if database already had tables prior to this run
        let dbExisted = false;
        if (this.isUsingNativeSQLite && this.sqliteDb) {
          try {
            const tableCheck = this.sqliteDb.executeSync(
              "SELECT count(*) as cnt FROM sqlite_master WHERE type='table' AND name='bills';",
            );
            const cnt = tableCheck?.rows?.[0]?.cnt ?? 0;
            dbExisted = Number(cnt) > 0;
          } catch {
            dbExisted = false;
          }
        }
        console.log('[DB][STARTUP][EXISTS]', dbExisted);

        // Execute table schemas in SQLite non-destructively
        console.log('[DB][STARTUP][SCHEMA]');
        if (this.isUsingNativeSQLite && this.sqliteDb) {
          try {
            this.sqliteDb.executeSync('PRAGMA foreign_keys = ON;');
            for (const ddl of CREATE_TABLES_SQL) {
              this.sqliteDb.executeSync(ddl);
            }
          } catch (ddlError) {
            console.warn('[DB] Schema DDL warning:', ddlError);
          }
        }

        // Apply safe non-destructive migrations to preserve all existing records
        console.log('[DB][STARTUP][MIGRATION]');
        if (this.isUsingNativeSQLite && this.sqliteDb) {
          const migrations = [
            'ALTER TABLE bills ADD COLUMN quotationNumber TEXT;',
            'ALTER TABLE bills ADD COLUMN customerPhone TEXT;',
            'ALTER TABLE bills ADD COLUMN customerAddress TEXT;',
            'ALTER TABLE bills ADD COLUMN vehicleNumber TEXT;',
            'ALTER TABLE bills ADD COLUMN vehicleType TEXT;',
            'ALTER TABLE bills ADD COLUMN vehicleDetails TEXT;',
            'ALTER TABLE bills ADD COLUMN vehicle TEXT;',
            "ALTER TABLE bills ADD COLUMN paymentStatus TEXT DEFAULT 'pending';",
            'ALTER TABLE bills ADD COLUMN paidAmount REAL DEFAULT 0;',
            'ALTER TABLE bills ADD COLUMN remainingAmount REAL DEFAULT 0;',
            'ALTER TABLE bills ADD COLUMN amountInWordsMarathi TEXT;',
            'ALTER TABLE bills ADD COLUMN amountInWordsEnglish TEXT;',
            'ALTER TABLE bills ADD COLUMN pdfUri TEXT;',
            'ALTER TABLE bills ADD COLUMN pdfFileName TEXT;',
            'ALTER TABLE bill_items ADD COLUMN itemSpecs TEXT;',
            'ALTER TABLE invoices ADD COLUMN customerPhone TEXT;',
            'ALTER TABLE invoices ADD COLUMN customerAddress TEXT;',
            'ALTER TABLE invoices ADD COLUMN sourceQuotationId TEXT;',
            'ALTER TABLE invoices ADD COLUMN sourceQuotationNumber TEXT;',
            'ALTER TABLE invoices ADD COLUMN borewellDepth REAL DEFAULT 0;',
            'ALTER TABLE invoices ADD COLUMN waterBearing REAL DEFAULT 0;',
            'ALTER TABLE invoices ADD COLUMN boreSize REAL DEFAULT 0;',
            'ALTER TABLE invoices ADD COLUMN deliveryDays INTEGER DEFAULT 7;',
            'ALTER TABLE invoices ADD COLUMN amountInWords TEXT;',
            'ALTER TABLE invoices ADD COLUMN amountInWordsMarathi TEXT;',
            'ALTER TABLE invoices ADD COLUMN amountInWordsEnglish TEXT;',
            'ALTER TABLE invoices ADD COLUMN paidAmount REAL DEFAULT 0;',
            'ALTER TABLE invoices ADD COLUMN remainingAmount REAL DEFAULT 0;',
            'ALTER TABLE invoices ADD COLUMN pdfUri TEXT;',
            'ALTER TABLE invoices ADD COLUMN pdfFileName TEXT;',
            'ALTER TABLE invoice_items ADD COLUMN itemSpecs TEXT;',
            'ALTER TABLE invoice_items ADD COLUMN particularsMr TEXT;',
            'ALTER TABLE invoice_items ADD COLUMN particularsEn TEXT;',
            'ALTER TABLE customers ADD COLUMN updatedAt TEXT;',
          ];

          for (const mig of migrations) {
            try {
              this.sqliteDb.executeSync(mig);
            } catch {
              // Column already exists - expected for updated schema
            }
          }
        }

        // Cache actual column names from SQLite for each table
        await this.refreshTableColumnsCache();

        // One-time legacy migration: if SQLite is empty but AsyncStorage had data
        if (this.isUsingNativeSQLite && this.sqliteDb) {
          try {
            const billCountRes = this.sqliteDb.executeSync(
              'SELECT COUNT(*) as c FROM bills;',
            );
            const sqliteBillCount = Number(billCountRes?.rows?.[0]?.c ?? 0);

            if (sqliteBillCount === 0) {
              const legacyJson = await AsyncStorage.getItem('@mahalaxmi_db_v1');
              if (legacyJson) {
                const legacyData = JSON.parse(legacyJson);
                await this.migrateLegacyDataToSqlite(legacyData);
              }
            }
          } catch (migrateErr) {
            console.warn('[DB] Legacy migration check notice:', migrateErr);
          }
        } else {
          // Fallback AsyncStorage hydration
          try {
            const stored = await AsyncStorage.getItem('@mahalaxmi_db_v1');
            if (stored) {
              const parsed = JSON.parse(stored);
              this.memoryStore = { ...this.memoryStore, ...parsed };
            }
          } catch (storageErr) {
            console.warn('[DB] AsyncStorage hydration warning:', storageErr);
          }
        }

        // Ensure default company profile exists
        await this.ensureDefaultProfile();

        // Mark completion
        console.log('[DB][STARTUP][COMPLETE]');

        // Persistence Count Verification Checks
        await this.logPersistenceCounts();
      } catch (err) {
        console.error('[DB] Startup initialization failed:', err);
      } finally {
        this.isInitialized = true;
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Refreshes the cached set of valid column names for every database table
   */
  private async refreshTableColumnsCache(): Promise<void> {
    if (!this.isUsingNativeSQLite || !this.sqliteDb) return;

    const tables = [
      'users',
      'customers',
      'bills',
      'bill_items',
      'invoices',
      'invoice_items',
      'income',
      'expenses',
      'reminders',
      'profile',
      'settings',
    ];

    for (const table of tables) {
      try {
        const info = this.sqliteDb.executeSync(`PRAGMA table_info(${table});`);
        const rows = Array.isArray(info?.rows)
          ? info.rows
          : Array.isArray(info?.rows?._array)
          ? info.rows._array
          : [];
        const cols = new Set<string>();
        for (const row of rows) {
          if (row.name) {
            cols.add(String(row.name).toLowerCase());
          }
        }
        this.tableColumns.set(table, cols);
      } catch {
        // Fallback or ignore
      }
    }
  }

  /**
   * Filters any input record to ONLY include columns that physically exist in the SQLite table.
   * Excludes related arrays (like items) and objects (like bill) to prevent SQLite syntax errors.
   */
  private sanitizeRecordForTable(table: string, record: any): { keys: string[]; values: any[] } {
    const validCols = this.tableColumns.get(table);
    const keys: string[] = [];
    const values: any[] = [];

    for (const [k, v] of Object.entries(record)) {
      // Exclude nested objects and arrays that belong in separate tables
      if (k === 'items' || k === 'bill' || Array.isArray(v)) {
        continue;
      }

      // If we have cached columns, only include matching columns
      if (validCols && validCols.size > 0) {
        if (!validCols.has(k.toLowerCase())) {
          continue;
        }
      }

      keys.push(k);
      if (v === undefined) {
        values.push(null);
      } else if (typeof v === 'boolean') {
        values.push(v ? 1 : 0);
      } else {
        values.push(v);
      }
    }

    return { keys, values };
  }

  /**
   * Safe migration of legacy records from AsyncStorage into SQLite
   */
  private async migrateLegacyDataToSqlite(legacyData: Record<string, any[]>): Promise<void> {
    if (!legacyData || !this.isUsingNativeSQLite || !this.sqliteDb) return;

    console.log('[DB] Migrating legacy records into SQLite...');
    const tables = [
      'users',
      'customers',
      'bills',
      'bill_items',
      'invoices',
      'invoice_items',
      'income',
      'expenses',
      'reminders',
      'profile',
      'settings',
    ];

    for (const table of tables) {
      const records = legacyData[table];
      if (Array.isArray(records) && records.length > 0) {
        for (const rec of records) {
          try {
            const { keys, values } = this.sanitizeRecordForTable(table, rec);
            if (keys.length > 0) {
              const placeholders = keys.map(() => '?').join(', ');
              this.sqliteDb.executeSync(
                `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders});`,
                values,
              );
            }
          } catch (migItemErr) {
            console.warn(`[DB] Legacy migration item warning for ${table}:`, migItemErr);
          }
        }
      }
    }
  }

  /**
   * Ensures default company profile exists without recursion
   */
  private async ensureDefaultProfile(): Promise<void> {
    const defaultProfile = {
      id: 'default_profile',
      name: 'Ashish',
      mobileNumber: '8379918585',
      email: 'mahalaxmiborewells@gmail.com',
      businessName: 'Mahalaxmi Borewell Electricals & Mechanicals',
      businessAddress: 'At Post Hanbarwadi, Taluka Karveer, District Kolhapur',
      gstNumber: '',
      updatedAt: new Date().toISOString(),
    };

    if (this.isUsingNativeSQLite && this.sqliteDb) {
      try {
        const res = this.sqliteDb.executeSync('SELECT COUNT(*) as c FROM profile;');
        const count = Number(res?.rows?.[0]?.c ?? 0);
        if (count === 0) {
          const { keys, values } = this.sanitizeRecordForTable('profile', defaultProfile);
          const placeholders = keys.map(() => '?').join(', ');
          this.sqliteDb.executeSync(
            `INSERT INTO profile (${keys.join(', ')}) VALUES (${placeholders});`,
            values,
          );
        }
      } catch {}
    } else {
      if (!this.memoryStore['profile'] || this.memoryStore['profile'].length === 0) {
        this.memoryStore['profile'] = [defaultProfile];
        await this.persistInternal();
      }
    }
  }

  /**
   * Logs persistence verification counts required by audit
   */
  private async logPersistenceCounts(): Promise<void> {
    let billsCount = 0;
    let quotationsCount = 0;
    let invoicesCount = 0;
    let customersCount = 0;

    if (this.isUsingNativeSQLite && this.sqliteDb) {
      try {
        const bRes = this.sqliteDb.executeSync('SELECT COUNT(*) as c FROM bills;');
        billsCount = Number(bRes?.rows?.[0]?.c ?? 0);

        const qRes = this.sqliteDb.executeSync(
          "SELECT COUNT(*) as c FROM bills WHERE (quotationNumber IS NOT NULL AND quotationNumber != '') OR billNumber LIKE 'Q-%';",
        );
        quotationsCount = Number(qRes?.rows?.[0]?.c ?? 0);

        const iRes = this.sqliteDb.executeSync('SELECT COUNT(*) as c FROM invoices;');
        invoicesCount = Number(iRes?.rows?.[0]?.c ?? 0);

        const cRes = this.sqliteDb.executeSync('SELECT COUNT(*) as c FROM customers;');
        customersCount = Number(cRes?.rows?.[0]?.c ?? 0);
      } catch (cntErr) {
        console.warn('[DB] Persistence count query warning:', cntErr);
      }
    } else {
      billsCount = (this.memoryStore['bills'] || []).length;
      quotationsCount = billsCount;
      invoicesCount = (this.memoryStore['invoices'] || []).length;
      customersCount = (this.memoryStore['customers'] || []).length;
    }

    console.log('[DB][CHECK][BILLS_COUNT]', billsCount);
    console.log('[DB][CHECK][QUOTATIONS_COUNT]', quotationsCount);
    console.log('[DB][CHECK][INVOICES_COUNT]', invoicesCount);
    console.log('[DB][CHECK][CUSTOMERS_COUNT]', customersCount);
  }

  private async persistInternal(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        '@mahalaxmi_db_v1',
        JSON.stringify(this.memoryStore),
      );
    } catch (e) {
      console.warn('Failed to persist database state:', e);
    }
  }

  public async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  // --- CRUD Operations ---

  public async getAll<T>(table: string): Promise<T[]> {
    await this.ensureInitialized();

    if (this.isUsingNativeSQLite && this.sqliteDb) {
      try {
        const result = this.sqliteDb.executeSync(`SELECT * FROM ${table};`);
        const rows = Array.isArray(result?.rows)
          ? result.rows
          : Array.isArray(result?.rows?._array)
          ? result.rows._array
          : null;
        if (rows) {
          // Mirror in memory store
          this.memoryStore[table] = JSON.parse(JSON.stringify(rows));
          return rows as T[];
        }
      } catch (err) {
        console.error(`[DB] Error fetching all from ${table}:`, err);
      }
    }

    const rows = this.memoryStore[table] || [];
    return JSON.parse(JSON.stringify(rows));
  }

  public async getById<T>(table: string, id: string): Promise<T | null> {
    await this.ensureInitialized();

    if (this.isUsingNativeSQLite && this.sqliteDb) {
      try {
        const result = this.sqliteDb.executeSync(
          `SELECT * FROM ${table} WHERE id = ? LIMIT 1;`,
          [id],
        );
        const rows = Array.isArray(result?.rows)
          ? result.rows
          : Array.isArray(result?.rows?._array)
          ? result.rows._array
          : null;
        if (rows && rows.length > 0) {
          return rows[0] as T;
        }
        return null;
      } catch (err) {
        console.error(`[DB] Error fetching by id from ${table}:`, err);
      }
    }

    const rows = this.memoryStore[table] || [];
    const item = rows.find((r: any) => r.id === id);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  public async insert<T extends { id: string }>(table: string, record: T): Promise<T> {
    await this.ensureInitialized();

    // 1. Commit to SQLite as primary master
    if (this.isUsingNativeSQLite && this.sqliteDb) {
      const { keys, values } = this.sanitizeRecordForTable(table, record);
      if (keys.length > 0) {
        const placeholders = keys.map(() => '?').join(', ');
        try {
          this.sqliteDb.executeSync(
            `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders});`,
            values,
          );
        } catch (nativeErr) {
          console.error(`[DB][INSERT][ERROR] Failed to insert into ${table}:`, nativeErr);
          throw nativeErr;
        }
      }
    }

    // 2. Mirror in memory store
    if (!this.memoryStore[table]) {
      this.memoryStore[table] = [];
    }
    const existingIndex = this.memoryStore[table].findIndex(
      (r: any) => r.id === record.id,
    );
    if (existingIndex >= 0) {
      this.memoryStore[table][existingIndex] = { ...record };
    } else {
      this.memoryStore[table].push({ ...record });
    }

    // 3. Mirror to persistent storage asynchronously
    this.persistInternal().catch(() => {});

    return record;
  }

  public async insertMany<T extends { id: string }>(
    table: string,
    records: T[],
  ): Promise<T[]> {
    await this.ensureInitialized();
    if (records.length === 0) return records;

    // 1. Commit to SQLite
    if (this.isUsingNativeSQLite && this.sqliteDb) {
      for (const record of records) {
        const { keys, values } = this.sanitizeRecordForTable(table, record);
        if (keys.length > 0) {
          const placeholders = keys.map(() => '?').join(', ');
          try {
            this.sqliteDb.executeSync(
              `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders});`,
              values,
            );
          } catch (batchErr) {
            console.error(`[DB][INSERT_MANY][ERROR] Failed for ${table}:`, batchErr);
            throw batchErr;
          }
        }
      }
    }

    // 2. Mirror in memory store
    if (!this.memoryStore[table]) {
      this.memoryStore[table] = [];
    }
    for (const record of records) {
      const idx = this.memoryStore[table].findIndex((r: any) => r.id === record.id);
      if (idx >= 0) {
        this.memoryStore[table][idx] = { ...record };
      } else {
        this.memoryStore[table].push({ ...record });
      }
    }

    this.persistInternal().catch(() => {});
    return records;
  }

  public async update<T extends { id: string }>(
    table: string,
    id: string,
    updates: Partial<T>,
  ): Promise<T | null> {
    await this.ensureInitialized();

    // 1. Commit to SQLite
    if (this.isUsingNativeSQLite && this.sqliteDb) {
      const { keys, values } = this.sanitizeRecordForTable(table, updates);
      if (keys.length > 0) {
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        try {
          this.sqliteDb.executeSync(
            `UPDATE ${table} SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?;`,
            [...values, id],
          );
        } catch (updateErr) {
          console.error(`[DB][UPDATE][ERROR] Failed to update ${table}:`, updateErr);
          throw updateErr;
        }
      }
    }

    // 2. Mirror in memory store
    const rows = this.memoryStore[table] || [];
    const index = rows.findIndex((r: any) => r.id === id);
    if (index >= 0) {
      rows[index] = {
        ...rows[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
    }

    this.persistInternal().catch(() => {});

    // Read back fresh record directly from SQLite
    return this.getById<T>(table, id);
  }

  public async delete(table: string, id: string): Promise<boolean> {
    await this.ensureInitialized();

    if (this.isUsingNativeSQLite && this.sqliteDb) {
      try {
        this.sqliteDb.executeSync(`DELETE FROM ${table} WHERE id = ?;`, [id]);
      } catch (delErr) {
        console.error(`[DB][DELETE][ERROR] Failed to delete from ${table}:`, delErr);
        throw delErr;
      }
    }

    const rows = this.memoryStore[table] || [];
    const initialLength = rows.length;
    this.memoryStore[table] = rows.filter((r: any) => r.id !== id);
    this.persistInternal().catch(() => {});

    return true;
  }

  public async deleteWhere(table: string, column: string, value: any): Promise<boolean> {
    await this.ensureInitialized();

    if (this.isUsingNativeSQLite && this.sqliteDb) {
      try {
        this.sqliteDb.executeSync(`DELETE FROM ${table} WHERE ${column} = ?;`, [value]);
      } catch (delErr) {
        console.error(`[DB][DELETE_WHERE][ERROR] Failed for ${table}:`, delErr);
        throw delErr;
      }
    }

    if (this.memoryStore[table]) {
      this.memoryStore[table] = this.memoryStore[table].filter(
        (r: any) => r[column] !== value,
      );
    }
    this.persistInternal().catch(() => {});
    return true;
  }

  /**
   * Atomic Transaction Runner:
   * Guarantees complete execution of all nested database operations or full rollback.
   */
  public async runTransaction<T>(callback: () => Promise<T>): Promise<T> {
    await this.ensureInitialized();
    const snapshot = JSON.stringify(this.memoryStore);

    if (this.isUsingNativeSQLite && this.sqliteDb) {
      try {
        this.sqliteDb.executeSync('BEGIN TRANSACTION;');
        const result = await callback();
        this.sqliteDb.executeSync('COMMIT;');
        this.persistInternal().catch(() => {});
        return result;
      } catch (err) {
        try {
          this.sqliteDb.executeSync('ROLLBACK;');
        } catch {
          // Ignore rollback error
        }
        this.memoryStore = JSON.parse(snapshot);
        throw err;
      }
    } else {
      try {
        const result = await callback();
        this.persistInternal().catch(() => {});
        return result;
      } catch (err) {
        this.memoryStore = JSON.parse(snapshot);
        throw err;
      }
    }
  }

  // --- Profile Operations ---
  public async getProfile(): Promise<any | null> {
    await this.ensureInitialized();
    if (this.isUsingNativeSQLite && this.sqliteDb) {
      try {
        const res = this.sqliteDb.executeSync('SELECT * FROM profile LIMIT 1;');
        if (res?.rows && res.rows.length > 0) {
          return res.rows[0];
        }
      } catch {}
    }
    const profiles = this.memoryStore['profile'] || [];
    return profiles[0] || null;
  }

  public async saveProfile(profile: any): Promise<any> {
    await this.ensureInitialized();
    if (this.isUsingNativeSQLite && this.sqliteDb) {
      const { keys, values } = this.sanitizeRecordForTable('profile', profile);
      const placeholders = keys.map(() => '?').join(', ');
      this.sqliteDb.executeSync(
        `INSERT OR REPLACE INTO profile (${keys.join(', ')}) VALUES (${placeholders});`,
        values,
      );
    }
    this.memoryStore['profile'] = [profile];
    await this.persistInternal();
    return profile;
  }

  // --- Settings Key/Value ---
  public async getSetting(key: string): Promise<string | null> {
    await this.ensureInitialized();
    if (this.isUsingNativeSQLite && this.sqliteDb) {
      try {
        const res = this.sqliteDb.executeSync(
          'SELECT value FROM settings WHERE key = ? LIMIT 1;',
          [key],
        );
        if (res?.rows && res.rows.length > 0) {
          return res.rows[0].value;
        }
      } catch {}
    }
    const settings = this.memoryStore['settings'] || [];
    const entry = settings.find((s: any) => s.key === key);
    return entry ? entry.value : null;
  }

  public async setSetting(key: string, value: string): Promise<void> {
    await this.ensureInitialized();
    const now = new Date().toISOString();
    if (this.isUsingNativeSQLite && this.sqliteDb) {
      try {
        this.sqliteDb.executeSync(
          'INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, ?);',
          [key, value, now],
        );
      } catch {}
    }
    if (!this.memoryStore['settings']) this.memoryStore['settings'] = [];
    const settings = this.memoryStore['settings'];
    const idx = settings.findIndex((s: any) => s.key === key);
    if (idx >= 0) {
      settings[idx].value = value;
      settings[idx].updatedAt = now;
    } else {
      settings.push({ key, value, updatedAt: now });
    }
    await this.persistInternal();
  }

  // --- Raw Export / Import for Safe Backup ---
  public async exportAllData(): Promise<Record<string, any[]>> {
    await this.ensureInitialized();
    const tables = [
      'customers',
      'bills',
      'bill_items',
      'invoices',
      'invoice_items',
      'income',
      'expenses',
      'reminders',
      'profile',
      'settings',
    ];
    const exportResult: Record<string, any[]> = {};
    for (const table of tables) {
      exportResult[table] = await this.getAll(table);
    }
    return exportResult;
  }

  public async importAllData(data: Record<string, any[]>): Promise<void> {
    await this.ensureInitialized();
    return this.runTransaction(async () => {
      for (const [table, records] of Object.entries(data)) {
        if (Array.isArray(records)) {
          // Clear and reload
          if (this.isUsingNativeSQLite && this.sqliteDb) {
            this.sqliteDb.executeSync(`DELETE FROM ${table};`);
          }
          this.memoryStore[table] = [];
          if (records.length > 0) {
            await this.insertMany(table, records);
          }
        }
      }
    });
  }
}

export const db = DatabaseService.getInstance();
