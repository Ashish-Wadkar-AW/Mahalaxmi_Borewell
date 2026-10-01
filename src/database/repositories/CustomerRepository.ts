import { db } from '../DatabaseService';
import { CustomerEntity } from '../../types/database';

export class CustomerRepository {
  /**
   * Retrieves all customers from the database.
   */
  public static async getAllCustomers(): Promise<CustomerEntity[]> {
    return db.getAll<CustomerEntity>('customers');
  }

  /**
   * Retrieves a single customer by their primary key ID.
   */
  public static async getCustomerById(id: string): Promise<CustomerEntity | null> {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return null;
    }
    return db.getById<CustomerEntity>('customers', id.trim());
  }

  /**
   * Finds an existing customer by phone / mobile number.
   */
  public static async findByPhone(phone: string): Promise<CustomerEntity | null> {
    const cleanPhone = (phone || '').trim();
    if (!cleanPhone) {
      return null;
    }
    const all = await db.getAll<CustomerEntity>('customers');
    return (
      all.find(c => {
        const cPhone = (c.mobileNumber || '').trim();
        return cPhone && cPhone === cleanPhone;
      }) || null
    );
  }

  /**
   * Finds an existing customer by name (case-insensitive).
   */
  public static async findByName(name: string): Promise<CustomerEntity | null> {
    const cleanName = (name || '').trim().toLowerCase();
    if (!cleanName) {
      return null;
    }
    const all = await db.getAll<CustomerEntity>('customers');
    return (
      all.find(c => {
        const cName = (c.name || '').trim().toLowerCase();
        return cName && cName === cleanName;
      }) || null
    );
  }

  /**
   * Directly creates and inserts a new customer entity into SQLite.
   */
  public static async createCustomer(
    customer: {
      id?: string;
      name: string;
      mobileNumber?: string;
      address?: string;
      createdAt?: string;
    },
  ): Promise<CustomerEntity> {
    const now = new Date().toISOString();
    const id = customer.id || 'cust_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    const entity: CustomerEntity = {
      id,
      name: (customer.name || '').trim(),
      mobileNumber: (customer.mobileNumber || '').trim(),
      address: (customer.address || '').trim(),
      createdAt: customer.createdAt || now,
      updatedAt: now,
    };

    console.log('[CUSTOMER][INSERT][REQUEST]', entity);
    const result = await db.insert<CustomerEntity>('customers', entity);
    console.log('[CUSTOMER][INSERT][RESPONSE]', result);
    return result;
  }

  /**
   * Updates an existing customer's details.
   */
  public static async updateCustomer(
    id: string,
    updates: Partial<CustomerEntity>,
  ): Promise<CustomerEntity | null> {
    if (!id || id.trim() === '') return null;
    const now = new Date().toISOString();
    return db.update<CustomerEntity>('customers', id.trim(), {
      ...updates,
      updatedAt: now,
    });
  }

  /**
   * Finds an existing customer (by phone first, then name) or creates a new customer.
   * Guarantees that the returned CustomerEntity exists in the SQLite `customers` table.
   */
  public static async findOrCreateCustomer(
    name: string,
    phone?: string,
    address?: string,
  ): Promise<CustomerEntity> {
    const cleanName = (name || '').trim();
    const cleanPhone = (phone || '').trim();
    const cleanAddress = (address || '').trim();

    // 1. Try matching by phone first (phone is unique identifier if provided)
    if (cleanPhone) {
      const byPhone = await CustomerRepository.findByPhone(cleanPhone);
      if (byPhone) {
        let hasChanges = false;
        const updates: Partial<CustomerEntity> = {};
        if (cleanName && cleanName !== byPhone.name) {
          updates.name = cleanName;
          byPhone.name = cleanName;
          hasChanges = true;
        }
        if (cleanAddress && cleanAddress !== byPhone.address) {
          updates.address = cleanAddress;
          byPhone.address = cleanAddress;
          hasChanges = true;
        }
        if (hasChanges) {
          await CustomerRepository.updateCustomer(byPhone.id, updates);
        }
        console.log('[CUSTOMER][REUSED][BY_PHONE]', {
          customerId: byPhone.id,
          name: byPhone.name,
          phone: byPhone.mobileNumber,
        });
        return byPhone;
      }
    }

    // 2. Try matching by name
    if (cleanName) {
      const byName = await CustomerRepository.findByName(cleanName);
      if (byName) {
        let hasChanges = false;
        const updates: Partial<CustomerEntity> = {};
        if (cleanPhone && cleanPhone !== byName.mobileNumber) {
          updates.mobileNumber = cleanPhone;
          byName.mobileNumber = cleanPhone;
          hasChanges = true;
        }
        if (cleanAddress && cleanAddress !== byName.address) {
          updates.address = cleanAddress;
          byName.address = cleanAddress;
          hasChanges = true;
        }
        if (hasChanges) {
          await CustomerRepository.updateCustomer(byName.id, updates);
        }
        console.log('[CUSTOMER][REUSED][BY_NAME]', {
          customerId: byName.id,
          name: byName.name,
          phone: byName.mobileNumber,
        });
        return byName;
      }
    }

    // 3. No match found -> create new customer
    const newCustomer = await CustomerRepository.createCustomer({
      name: cleanName || 'Customer',
      mobileNumber: cleanPhone,
      address: cleanAddress,
    });

    console.log('[CUSTOMER][CREATED]', {
      customerId: newCustomer.id,
      name: newCustomer.name,
      phone: newCustomer.mobileNumber,
    });

    return newCustomer;
  }
}
