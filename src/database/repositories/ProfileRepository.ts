import { db } from '../DatabaseService';
import { ProfileEntity } from '../../types/database';

export class ProfileRepository {
  public static async getProfile(): Promise<ProfileEntity> {
    const profile = await db.getProfile();
    if (profile) return profile;

    const defaultProfile: ProfileEntity = {
      id: 'default_profile',
      name: 'Ashish',
      mobileNumber: '8379918585',
      email: 'mahalaxmiborewells@gmail.com',
      businessName: 'Mahalaxmi Borewell Electricals & Mechanicals',
      businessAddress: 'At Post Hanbarwadi, Taluka Karveer, District Kolhapur',
      gstNumber: '',
      updatedAt: new Date().toISOString(),
    };

    return db.saveProfile(defaultProfile);
  }

  public static async updateProfile(profile: ProfileEntity): Promise<ProfileEntity> {
    return db.saveProfile({
      ...profile,
      updatedAt: new Date().toISOString(),
    });
  }
}
