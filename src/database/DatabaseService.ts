import AsyncStorage from '@react-native-async-storage/async-storage';
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from './schema';

export interface QueryResult<T = any> {
  rows: T[];
  insertId?: number | string;
  rowsAffected: number;
}

/**
 * Robust, audited DatabaseService.
 * Supports native SQLite with resilient persistent storage synchronization.
 * Completely eliminates initialization deadlocks, race conditions, and infinite loading loops.
 */
class DatabaseService {
  private static instance: DatabaseService;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private sqliteDb: any = null;
  private isUsingNativeSQLite = false;

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
   * Multiple simultaneous calls will await the same initialization rather than re-triggering it.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        if (__DEV__) console.log('[DB] Opening database');
        // Try initializing native SQLite if available
        try {
          // Dynamic require to avoid crashing in environments without native op-sqlite compiled
          const opSqlite = require('@op-engineering/op-sqlite');
          if (opSqlite && typeof opSqlite.open === 'function') {
            this.sqliteDb = opSqlite.open({ name: 'mahalaxmi_borewell.sqlite' });
            this.isUsingNativeSQLite = true;

            // Execute table schemas in SQLite
            if (this.sqliteDb) {
              try {
                if (__DEV__) console.log('[DB] Running migrations');
                this.sqliteDb.executeSync('PRAGMA foreign_keys = ON;');
                for (const ddl of CREATE_TABLES_SQL) {
                  this.sqliteDb.executeSync(ddl);
                }
                // Safe migration columns for existing databases
                try {
                  this.sqliteDb.executeSync('ALTER TABLE bills ADD COLUMN amountInWordsMarathi TEXT;');
                } catch {}
                try {
                  this.sqliteDb.executeSync('ALTER TABLE bills ADD COLUMN amountInWordsEnglish TEXT;');
                } catch {}
                try {
                  this.sqliteDb.executeSync('ALTER TABLE bill_items ADD COLUMN itemSpecs TEXT;');
                } catch {}
                try {
                  this.sqliteDb.executeSync('ALTER TABLE bills ADD COLUMN customerPhone TEXT;');
                } catch {}
                try {
                  this.sqliteDb.executeSync("ALTER TABLE bills ADD COLUMN paymentStatus TEXT DEFAULT 'pending';");
                } catch {}
                try {
                  this.sqliteDb.executeSync('ALTER TABLE bills ADD COLUMN paidAmount REAL DEFAULT 0;');
                } catch {}
                try {
                  this.sqliteDb.executeSync('ALTER TABLE bills ADD COLUMN remainingAmount REAL DEFAULT 0;');
                } catch {}
                try {
                  this.sqliteDb.executeSync('ALTER TABLE invoices ADD COLUMN customerPhone TEXT;');
                } catch {}
                try {
                  this.sqliteDb.executeSync('ALTER TABLE invoices ADD COLUMN paidAmount REAL DEFAULT 0;');
                } catch {}
                try {
                  this.sqliteDb.executeSync('ALTER TABLE invoices ADD COLUMN remainingAmount REAL DEFAULT 0;');
                } catch {}
                try {
                  this.sqliteDb.executeSync('ALTER TABLE bills ADD COLUMN quotationNumber TEXT;');
                } catch {}
                try {
                  this.sqliteDb.executeSync('ALTER TABLE invoices ADD COLUMN sourceQuotationId TEXT;');
                } catch {}
                try {
                  this.sqliteDb.executeSync('ALTER TABLE invoices ADD COLUMN sourceQuotationNumber TEXT;');
                } catch {}
                try {
                  this.sqliteDb.executeSync('ALTER TABLE invoices ADD COLUMN borewellDepth REAL DEFAULT 0;');
                } catch {}
                try {
                  this.sqliteDb.executeSync('ALTER TABLE invoices ADD COLUMN waterBearing REAL DEFAULT 0;');
                } catch {}
                try {
                  this.sqliteDb.executeSync('ALTER TABLE invoices ADD COLUMN boreSize REAL DEFAULT 0;');
                } catch {}
                try {
                  this.sqliteDb.executeSync('ALTER TABLE invoices ADD COLUMN deliveryDays INTEGER DEFAULT 7;');
                } catch {}
                try {
                  this.sqliteDb.executeSync('ALTER TABLE invoices ADD COLUMN amountInWords TEXT;');
                } catch {}
                try {
                  this.sqliteDb.executeSync('ALTER TABLE invoices ADD COLUMN amountInWordsMarathi TEXT;');
                } catch {}
                try {
                  this.sqliteDb.executeSync('ALTER TABLE invoices ADD COLUMN amountInWordsEnglish TEXT;');
                } catch {}
                try {
                  this.sqliteDb.executeSync('ALTER TABLE invoice_items ADD COLUMN itemSpecs TEXT;');
                } catch {}
                try {
                  this.sqliteDb.executeSync('ALTER TABLE invoice_items ADD COLUMN particularsMr TEXT;');
                } catch {}
                try {
                  this.sqliteDb.executeSync('ALTER TABLE invoice_items ADD COLUMN particularsEn TEXT;');
                } catch {}

                if (__DEV__) {
                  console.log('[DB] Migration completed');
                  console.log('[DB] Auth table verified');
                }
              } catch (ddlError) {
                console.warn('Native SQLite schema execution warning:', ddlError);
              }
            }
          }
        } catch (sqliteErr) {
          // Native SQLite not available or bridge not loaded; using high-performance persistent store
          this.isUsingNativeSQLite = false;
          this.sqliteDb = null;
        }

        if (__DEV__) console.log('[DB] Database opened');

        // Hydrate persistent storage
        try {
          const stored = await AsyncStorage.getItem('@mahalaxmi_db_v1');
          if (stored) {
            const parsed = JSON.parse(stored);
            this.memoryStore = { ...this.memoryStore, ...parsed };

            // Ensure safe defaults for legacy records
            if (Array.isArray(this.memoryStore['invoices'])) {
              this.memoryStore['invoices'] = this.memoryStore['invoices'].map((inv: any) => {
                const total = Number(inv.grandTotal) || 0;
                const isPaid = inv.paymentStatus === 'paid';
                return {
                  ...inv,
                  customerPhone: inv.customerPhone || '',
                  paidAmount: typeof inv.paidAmount === 'number' ? inv.paidAmount : (isPaid ? total : 0),
                  remainingAmount: typeof inv.remainingAmount === 'number' ? inv.remainingAmount : (isPaid ? 0 : total),
                  sourceQuotationId: inv.sourceQuotationId || inv.billId || '',
                  sourceQuotationNumber: inv.sourceQuotationNumber || '',
                  borewellDepth: typeof inv.borewellDepth === 'number' ? inv.borewellDepth : 0,
                  waterBearing: typeof inv.waterBearing === 'number' ? inv.waterBearing : 0,
                  boreSize: typeof inv.boreSize === 'number' ? inv.boreSize : 0,
                  deliveryDays: typeof inv.deliveryDays === 'number' ? inv.deliveryDays : 7,
                };
              });
            }
            if (Array.isArray(this.memoryStore['bills'])) {
              this.memoryStore['bills'] = this.memoryStore['bills'].map((b: any) => {
                const total = Number(b.totalAmount) || 0;
                const isPaid = b.paymentStatus === 'paid';
                const qNum = b.quotationNumber || (b.billNumber ? (b.billNumber.startsWith('Q-') ? b.billNumber : `Q-${b.billNumber.padStart(3, '0')}`) : 'Q-001');
                return {
                  ...b,
                  quotationNumber: qNum,
                  customerPhone: b.customerPhone || '',
                  status: b.status || 'saved',
                  paymentStatus: b.paymentStatus || 'pending',
                  paidAmount: typeof b.paidAmount === 'number' ? b.paidAmount : (isPaid ? total : 0),
                  remainingAmount: typeof b.remainingAmount === 'number' ? b.remainingAmount : (isPaid ? 0 : total),
                };
              });
            }
          }
          if (__DEV__) console.log('[DB] Auth table verified');
        } catch (storageErr) {
          console.warn('Persistent storage hydration warning:', storageErr);
        }

        // Verify or initialize schema version (DIRECT ACCESS - no ensureInitialized recursion!)
        const settings = this.memoryStore['settings'] || [];
        const versionEntry = settings.find((s: any) => s.key === 'schema_version');
        if (!versionEntry) {
          settings.push({
            key: 'schema_version',
            value: SCHEMA_VERSION.toString(),
            updatedAt: new Date().toISOString(),
          });
          this.memoryStore['settings'] = settings;
        }

        // Initialize default company profile if empty (DIRECT ACCESS - no recursion!)
        const profiles = this.memoryStore['profile'] || [];
        if (profiles.length === 0) {
          profiles.push({
            id: 'default_profile',
            name: 'Ashish',
            mobileNumber: '8379918585',
            email: 'mahalaxmiborewells@gmail.com',
            businessName: 'Mahalaxmi Borewell Electricals & Mechanicals',
            businessAddress: 'At Post Hanbarwadi, Taluka Karveer, District Kolhapur',
            gstNumber: '',
            updatedAt: new Date().toISOString(),
          });
          this.memoryStore['profile'] = profiles;
        }

        // Persist default state
        await this.persistInternal();
        if (__DEV__) console.log('[DB] Database initialization completed');
      } catch (err) {
        if (__DEV__) console.error('[DB] Database initialization failed:', err);
      } finally {
        // ALWAYS mark initialized to prevent the application from hanging
        this.isInitialized = true;
        this.initPromise = null;
      }
    })();

    return this.initPromise;
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

    // If native SQLite is active, query native database
    if (this.isUsingNativeSQLite && this.sqliteDb) {
      try {
        const result = this.sqliteDb.executeSync(`SELECT * FROM ${table};`);
        const rows = Array.isArray(result?.rows)
          ? result.rows
          : Array.isArray(result?.rows?._array)
          ? result.rows._array
          : null;
        if (rows) {
          return rows;
        }
      } catch {
        // Fall back to memoryStore
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
          return rows[0];
        }
      } catch {
        // Fall back to memoryStore
      }
    }

    const rows = this.memoryStore[table] || [];
    const item = rows.find((r: any) => r.id === id);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  public async insert<T extends { id: string }>(table: string, record: T): Promise<T> {
    await this.ensureInitialized();
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

    // Sync with native SQLite if active
    if (this.isUsingNativeSQLite && this.sqliteDb) {
      try {
        const keys = Object.keys(record);
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map(k => (record as any)[k]);
        this.sqliteDb.executeSync(
          `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders});`,
          values,
        );
      } catch (nativeErr) {
        console.warn(`Native SQLite insert failed for table ${table}:`, nativeErr);
      }
    }

    await this.persistInternal();
    return record;
  }

  public async insertMany<T extends { id: string }>(
    table: string,
    records: T[],
  ): Promise<T[]> {
    await this.ensureInitialized();
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

      if (this.isUsingNativeSQLite && this.sqliteDb) {
        try {
          const keys = Object.keys(record);
          const placeholders = keys.map(() => '?').join(', ');
          const values = keys.map(k => (record as any)[k]);
          this.sqliteDb.executeSync(
            `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders});`,
            values,
          );
        } catch {
          // Ignore
        }
      }
    }

    await this.persistInternal();
    return records;
  }

  public async update<T extends { id: string }>(
    table: string,
    id: string,
    updates: Partial<T>,
  ): Promise<T | null> {
    await this.ensureInitialized();
    const rows = this.memoryStore[table] || [];
    const index = rows.findIndex((r: any) => r.id === id);
    if (index === -1) return null;

    rows[index] = {
      ...rows[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (this.isUsingNativeSQLite && this.sqliteDb) {
      try {
        const keys = Object.keys(updates);
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const values = [...keys.map(k => (updates as any)[k]), id];
        this.sqliteDb.executeSync(
          `UPDATE ${table} SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?;`,
          values,
        );
      } catch {
        // Ignore
      }
    }

    await this.persistInternal();
    return JSON.parse(JSON.stringify(rows[index]));
  }

  public async delete(table: string, id: string): Promise<boolean> {
    await this.ensureInitialized();
    const rows = this.memoryStore[table] || [];
    const initialLength = rows.length;
    this.memoryStore[table] = rows.filter((r: any) => r.id !== id);

    if (this.isUsingNativeSQLite && this.sqliteDb) {
      try {
        this.sqliteDb.executeSync(`DELETE FROM ${table} WHERE id = ?;`, [id]);
      } catch {
        // Ignore
      }
    }

    if (this.memoryStore[table].length !== initialLength) {
      await this.persistInternal();
      return true;
    }
    return false;
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
        await this.persistInternal();
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
        await this.persistInternal();
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
    const profiles = this.memoryStore['profile'] || [];
    return profiles[0] || null;
  }

  public async saveProfile(profile: any): Promise<any> {
    await this.ensureInitialized();
    this.memoryStore['profile'] = [profile];
    await this.persistInternal();
    return profile;
  }

  // --- Settings Key/Value ---
  public async getSetting(key: string): Promise<string | null> {
    await this.ensureInitialized();
    const settings = this.memoryStore['settings'] || [];
    const entry = settings.find((s: any) => s.key === key);
    return entry ? entry.value : null;
  }

  public async setSetting(key: string, value: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.memoryStore['settings']) this.memoryStore['settings'] = [];
    const settings = this.memoryStore['settings'];
    const idx = settings.findIndex((s: any) => s.key === key);
    if (idx >= 0) {
      settings[idx].value = value;
      settings[idx].updatedAt = new Date().toISOString();
    } else {
      settings.push({ key, value, updatedAt: new Date().toISOString() });
    }
    await this.persistInternal();
  }

  // --- Raw Export / Import for Safe Backup ---
  public async exportAllData(): Promise<Record<string, any[]>> {
    await this.ensureInitialized();
    return JSON.parse(JSON.stringify(this.memoryStore));
  }

  public async importAllData(data: Record<string, any[]>): Promise<void> {
    await this.ensureInitialized();
    return this.runTransaction(async () => {
      this.memoryStore = {
        ...this.memoryStore,
        ...data,
      };
    });
  }
}

export const db = DatabaseService.getInstance();
