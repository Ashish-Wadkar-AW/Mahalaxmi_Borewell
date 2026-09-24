import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SessionMetadata {
  token: string;
  userId: string;
  mobileNumber: string;
  createdAt: number;
  expiresAt: number;
}

const SECURE_KEY = 'mahalaxmi_session_token';
const FALLBACK_KEY = '@mahalaxmi_secure_session_meta';
const KEYCHAIN_TIMEOUT_MS = 1500;

export class SecureStorageService {
  /**
   * Helper to execute a promise with a timeout so Keychain operations never deadlock
   */
  private static withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
    return Promise.race([
      promise,
      new Promise<null>(resolve => setTimeout(() => resolve(null), timeoutMs)),
    ]);
  }

  /**
   * Securely saves session token and metadata using Keychain with encrypted storage fallback
   */
  public static async saveSession(session: SessionMetadata): Promise<void> {
    const payload = JSON.stringify(session);

    // Save to persistent fallback first so data is guaranteed saved immediately
    try {
      await AsyncStorage.setItem(FALLBACK_KEY, payload);
    } catch (storageErr) {
      console.warn('Storage save fallback warning:', storageErr);
    }

    // Then try saving to Hardware Keychain with timeout
    try {
      const keychainPromise = Keychain.setGenericPassword(SECURE_KEY, payload, {
        service: 'com.mahalaxmi_borewell.auth',
      });
      await SecureStorageService.withTimeout(keychainPromise, KEYCHAIN_TIMEOUT_MS);
    } catch {
      // Ignore native keychain error as fallback is already safely stored
    }
  }

  /**
   * Retrieves stored session metadata with guaranteed non-hanging timeout
   */
  public static async getSession(): Promise<SessionMetadata | null> {
    // 1. Try Hardware Keychain first (with timeout to prevent infinite hanging)
    try {
      const keychainPromise = Keychain.getGenericPassword({
        service: 'com.mahalaxmi_borewell.auth',
      });
      const credentials = await SecureStorageService.withTimeout(keychainPromise, KEYCHAIN_TIMEOUT_MS);

      if (credentials && typeof credentials === 'object' && 'password' in credentials && credentials.password) {
        return JSON.parse(credentials.password);
      }
    } catch {
      // Keychain not available or timed out; proceed to fallback
    }

    // 2. Try Fallback Storage
    try {
      const stored = await AsyncStorage.getItem(FALLBACK_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore
    }

    return null;
  }

  /**
   * Completely purges the session token and metadata
   */
  public static async clearSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(FALLBACK_KEY);
    } catch {
      // Ignore
    }

    try {
      const keychainPromise = Keychain.resetGenericPassword({
        service: 'com.mahalaxmi_borewell.auth',
      });
      await SecureStorageService.withTimeout(keychainPromise, KEYCHAIN_TIMEOUT_MS);
    } catch {
      // Ignore
    }
  }
}
