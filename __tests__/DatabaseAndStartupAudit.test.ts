const storage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn((k: string, v: string) => {
    storage[k] = v;
    return Promise.resolve();
  }),
  getItem: jest.fn((k: string) => Promise.resolve(storage[k] || null)),
  removeItem: jest.fn((k: string) => {
    delete storage[k];
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    Object.keys(storage).forEach(k => delete storage[k]);
    return Promise.resolve();
  }),
}));

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(() => Promise.resolve(null)),
  resetGenericPassword: jest.fn(),
}));

import { db } from '../src/database/DatabaseService';
import { AuthService } from '../src/services/AuthService';
import { SecureStorageService } from '../src/services/SecureStorageService';
import billingReducer, {
  saveBillThunk,
  setCustomerName,
  updateItemQuantity,
  updateItemRate,
  resetBillingForm,
} from '../src/redux/slices/billingSlice';
import { configureStore } from '@reduxjs/toolkit';
import { BillRepository } from '../src/database/repositories/BillRepository';

describe('Database & Startup Audit', () => {
  it('initializes DatabaseService cleanly without deadlocking or infinite recursion', async () => {
    // Calling init multiple times simultaneously to test race conditions
    const [init1, init2, init3] = await Promise.all([
      db.init(),
      db.init(),
      db.init(),
    ]);

    expect(init1).toBeUndefined();
    expect(init2).toBeUndefined();
    expect(init3).toBeUndefined();

    // Verify default profile exists after init
    const profile = await db.getProfile();
    expect(profile).not.toBeNull();
    expect(profile.businessName).toBe('Mahalaxmi Borewell Electricals & Mechanicals');
  });

  it('session validation resolves cleanly without hanging', async () => {
    const sessionStatus = await AuthService.validateSession();
    expect(sessionStatus).toHaveProperty('isValid');
    expect(sessionStatus).toHaveProperty('isExpired');
    expect(sessionStatus.isValid).toBe(false); // No session yet
  });

  it('stores and retrieves session via SecureStorageService with timeout resilience', async () => {
    const mockSession = {
      token: 'test_token_1234567890',
      userId: 'user_1',
      mobileNumber: '8379918585',
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 24 * 60 * 60 * 1000,
    };

    await SecureStorageService.saveSession(mockSession);
    const retrieved = await SecureStorageService.getSession();

    expect(retrieved).not.toBeNull();
    expect(retrieved?.userId).toBe('user_1');
    expect(retrieved?.mobileNumber).toBe('8379918585');

    // Clean up
    await SecureStorageService.clearSession();
    const afterClear = await SecureStorageService.getSession();
    expect(afterClear).toBeNull();
  });

  it('authenticates master account using secure PBKDF2 hash comparison', async () => {
    // Attempt login with valid credentials
    const loginRes = await AuthService.login('8379918585', 'admin');
    expect(loginRes.success).toBe(true);
    expect(loginRes.user).toBeDefined();
    expect(loginRes.user?.mobileNumber).toBe('8379918585');
    expect(loginRes.session).toBeDefined();
    expect(loginRes.session?.token).toBeDefined();

    // Verify 15-day session duration
    const sessionDiff = (loginRes.session!.expiresAt - loginRes.session!.createdAt);
    expect(sessionDiff).toBe(15 * 24 * 60 * 60 * 1000);

    // Attempt login with wrong password
    const wrongPassRes = await AuthService.login('8379918585', 'incorrect_password');
    expect(wrongPassRes.success).toBe(false);
    expect(wrongPassRes.error).toContain('Invalid password');

    // Attempt login with non-existent user
    const nonUserRes = await AuthService.login('9999999999', 'admin');
    expect(nonUserRes.success).toBe(false);
    expect(nonUserRes.error).toContain('User not found');
  });

  it('handles user registration with unique salt, password hash, and duplicate prevention', async () => {
    const testMobile = '9876543210';
    const testPassword = 'securePassword123';
    const regRes = await AuthService.register('New Client User', testMobile, testPassword);

    expect(regRes.success).toBe(true);
    expect(regRes.user?.name).toBe('New Client User');
    expect(regRes.user?.passwordHash).not.toBe(testPassword);
    expect(regRes.user?.passwordSalt).toBeDefined();
    expect(regRes.session).toBeDefined();

    // Attempt duplicate registration with same mobile number
    const dupRes = await AuthService.register('Duplicate User', testMobile, 'anotherPass');
    expect(dupRes.success).toBe(false);
    expect(dupRes.error).toContain('already exists');

    // Logging in with newly registered user
    const loginNew = await AuthService.login(testMobile, testPassword);
    expect(loginNew.success).toBe(true);
    expect(loginNew.user?.name).toBe('New Client User');

    // Logout
    await AuthService.logout();
    const sessionAfterLogout = await AuthService.validateSession();
    expect(sessionAfterLogout.isValid).toBe(false);
  });

  it('executes billing save flow cleanly without premature isSaving lock and persists to SQLite', async () => {
    const store = configureStore({
      reducer: {
        billing: billingReducer,
      },
    });

    // Initial state check
    expect(store.getState().billing.isSaving).toBe(false);

    // Setup valid billing form
    store.dispatch(setCustomerName('Ramchandra Patil'));
    store.dispatch(updateItemQuantity({ index: 0, quantity: '1' }));
    store.dispatch(updateItemRate({ index: 0, rate: '28000' }));

    expect(store.getState().billing.grandTotal).toBe(28000);

    // Dispatch saveBillThunk - MUST NOT reject with "Save already in progress."
    const savePromise = store.dispatch(saveBillThunk());

    // While in flight, condition blocks duplicate calls
    const duplicatePromise = store.dispatch(saveBillThunk());
    const duplicateResult = await duplicatePromise;
    expect((duplicateResult as any).meta?.condition).toBe(true);

    const result = await savePromise;
    expect(saveBillThunk.fulfilled.match(result)).toBe(true);

    if (saveBillThunk.fulfilled.match(result)) {
      expect(result.payload.bill).toBeDefined();
      expect(result.payload.bill.customerName).toBe('Ramchandra Patil');
      expect(result.payload.invoice).toBeDefined();
      expect(result.payload.invoice.grandTotal).toBe(28000);

      // Verify lock is released
      expect(store.getState().billing.isSaving).toBe(false);

      // Verify persistence in SQLite
      const allBills = await BillRepository.getAllBills();
      const saved = allBills.find(b => b.id === result.payload.bill.id);
      expect(saved).toBeDefined();
      expect(saved?.customerName).toBe('Ramchandra Patil');
    }

    // Reset form check
    store.dispatch(resetBillingForm());
    expect(store.getState().billing.isSaving).toBe(false);
    expect(store.getState().billing.customerName).toBe('');
  });
});
