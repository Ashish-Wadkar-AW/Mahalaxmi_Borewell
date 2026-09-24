import { db } from '../DatabaseService';
import { UserEntity } from '../../types/database';

export class AuthRepository {
  public static async findByMobile(mobileNumber: string): Promise<UserEntity | null> {
    const users = await db.getAll<UserEntity>('users');
    return users.find(u => u.mobileNumber === mobileNumber) || null;
  }

  public static async createUser(user: UserEntity): Promise<UserEntity> {
    return db.insert<UserEntity>('users', user);
  }

  public static async getAllUsers(): Promise<UserEntity[]> {
    return db.getAll<UserEntity>('users');
  }

  public static async updateUser(id: string, updates: Partial<UserEntity>): Promise<UserEntity | null> {
    return db.update<UserEntity>('users', id, updates);
  }
}
