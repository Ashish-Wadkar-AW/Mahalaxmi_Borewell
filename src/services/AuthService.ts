import CryptoJS from 'crypto-js';
import { AuthRepository } from '../database/repositories/AuthRepository';
import { SecureStorageService, SessionMetadata } from './SecureStorageService';
import { UserEntity } from '../types/database';

export const SESSION_DURATION_MS = 15 * 24 * 60 * 60 * 1000; // Exact 15 days in milliseconds

export interface AuthResult {
  success: boolean;
  user?: UserEntity;
  session?: SessionMetadata;
  error?: string;
}

function getNativeCrypto(): { getRandomValues: (array: Uint8Array) => Uint8Array } | null {
  const g = typeof globalThis !== 'undefined' ? (globalThis as any) : null;
  if (g && g.crypto && typeof g.crypto.getRandomValues === 'function') {
    return g.crypto;
  }
  return null;
}

export class AuthService {
  /**
   * Generates a cryptographically secure 128-bit salt (hex encoded)
   */
  public static generateSalt(): string {
    try {
      const nativeCrypto = getNativeCrypto();
      if (nativeCrypto) {
        const bytes = new Uint8Array(16);
        nativeCrypto.getRandomValues(bytes);
        return Array.from(bytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      }
      return CryptoJS.lib.WordArray.random(16).toString();
    } catch (err: any) {
      console.error('AuthService.generateSalt error:', err);
      throw new Error(`Failed to generate cryptographically secure salt: ${err.message || 'Native crypto module not available'}`);
    }
  }

  /**
   * Hashes a password using PBKDF2 with a given salt
   */
  public static hashPassword(password: string, salt: string): string {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: 1000,
    }).toString();
  }

  /**
   * Generates a cryptographically secure 256-bit session token
   */
  public static generateSessionToken(): string {
    try {
      let randomHex = '';
      const nativeCrypto = getNativeCrypto();
      if (nativeCrypto) {
        const bytes = new Uint8Array(32);
        nativeCrypto.getRandomValues(bytes);
        randomHex = Array.from(bytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      } else {
        randomHex = CryptoJS.lib.WordArray.random(32).toString();
      }
      const timestamp = Date.now().toString(16);
      return `${randomHex}-${timestamp}`;
    } catch (err: any) {
      console.error('AuthService.generateSessionToken error:', err);
      throw new Error(`Failed to generate cryptographically secure session token: ${err.message || 'Native crypto module not available'}`);
    }
  }

  /**
   * Initializes local master account if no users exist
   */
  public static async initializeMasterAccount(): Promise<void> {
    try {
      if (__DEV__) console.log('[DB] Master account check started');
      const users = await AuthRepository.getAllUsers();
      if (users.length === 0) {
        if (__DEV__) console.log('[DB] Master account creation started');
        // Create initial local owner account with contact phone from physical quotation
        const defaultMobile = '8379918585';
        const defaultPassword = 'admin'; // User can change password or register
        const salt = AuthService.generateSalt();
        const hash = AuthService.hashPassword(defaultPassword, salt);

        await AuthRepository.createUser({
          id: 'user_master_1',
          mobileNumber: defaultMobile,
          passwordHash: hash,
          passwordSalt: salt,
          name: 'Mahalaxmi Borewell Admin',
          role: 'owner',
          createdAt: new Date().toISOString(),
        });
        if (__DEV__) console.log('[DB] Master account created');
      } else {
        if (__DEV__) console.log('[DB] Master account exists');
      }
    } catch (err: any) {
      if (__DEV__) console.error('[DB] Master account check/creation failed:', err);
      // Re-throw so callers can handle database failures gracefully
      throw new Error(`Database error during master account initialization: ${err.message}`);
    }
  }

  /**
   * Authenticates user against local SQLite credentials
   */
  public static async login(mobileNumber: string, password: string): Promise<AuthResult> {
    try {
      const cleanMobile = mobileNumber ? mobileNumber.trim() : '';
      const cleanPassword = password ? password.trim() : '';

      if (!cleanMobile) {
        return {
          success: false,
          error: 'Please enter your mobile number.',
        };
      }
      if (!cleanPassword) {
        return {
          success: false,
          error: 'Please enter your password.',
        };
      }

      await AuthService.initializeMasterAccount();

      const user = await AuthRepository.findByMobile(cleanMobile);
      if (!user) {
        return {
          success: false,
          error: 'User not found. Please check mobile number or register a new account.',
        };
      }

      const computedHash = AuthService.hashPassword(cleanPassword, user.passwordSalt);
      if (computedHash !== user.passwordHash) {
        return {
          success: false,
          error: 'Invalid password. Please verify and try again.',
        };
      }

      // Generate 15-day session
      const now = Date.now();
      const sessionToken = AuthService.generateSessionToken();
      const session: SessionMetadata = {
        token: sessionToken,
        userId: user.id,
        mobileNumber: user.mobileNumber,
        createdAt: now,
        expiresAt: now + SESSION_DURATION_MS,
      };

      // Store in secure device storage
      await SecureStorageService.saveSession(session);

      return {
        success: true,
        user,
        session,
      };
    } catch (err: any) {
      console.error('AuthService.login error:', err);
      return {
        success: false,
        error: err.message || 'An unexpected error occurred during login.',
      };
    }
  }

  /**
   * Register a new local user (if needed)
   */
  public static async register(
    name: string,
    mobileNumber: string,
    password: string,
  ): Promise<AuthResult> {
    try {
      const cleanMobile = mobileNumber ? mobileNumber.trim() : '';
      const cleanName = name ? name.trim() : '';
      const cleanPassword = password ? password.trim() : '';

      if (!cleanName) {
        return {
          success: false,
          error: 'Please enter your full name.',
        };
      }
      if (!cleanMobile || cleanMobile.length < 10) {
        return {
          success: false,
          error: 'Please enter a valid 10-digit mobile number.',
        };
      }
      if (!cleanPassword || cleanPassword.length < 4) {
        return {
          success: false,
          error: 'Password must be at least 4 characters long.',
        };
      }

      const existing = await AuthRepository.findByMobile(cleanMobile);
      if (existing) {
        return {
          success: false,
          error: 'A user with this mobile number already exists. Please login instead.',
        };
      }

      const salt = AuthService.generateSalt();
      const hash = AuthService.hashPassword(cleanPassword, salt);

      const newUser: UserEntity = {
        id: 'user_' + Date.now(),
        mobileNumber: cleanMobile,
        passwordHash: hash,
        passwordSalt: salt,
        name: cleanName,
        role: 'owner',
        createdAt: new Date().toISOString(),
      };

      await AuthRepository.createUser(newUser);
      return await AuthService.login(cleanMobile, cleanPassword);
    } catch (err: any) {
      console.error('AuthService.register error:', err);
      return {
        success: false,
        error: err.message || 'An unexpected error occurred during registration.',
      };
    }
  }

  /**
   * Validates active session token and 15-day expiry
   */
  public static async validateSession(): Promise<{
    isValid: boolean;
    session?: SessionMetadata;
    isExpired: boolean;
  }> {
    const session = await SecureStorageService.getSession();
    if (!session) {
      return { isValid: false, isExpired: false };
    }

    const now = Date.now();
    if (now > session.expiresAt) {
      // Expired! Clear session immediately
      await SecureStorageService.clearSession();
      return { isValid: false, isExpired: true };
    }

    return { isValid: true, session, isExpired: false };
  }

  /**
   * Logs out user: clears secure storage and invalidates local session
   */
  public static async logout(): Promise<void> {
    await SecureStorageService.clearSession();
  }
}
