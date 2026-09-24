import { db } from '../DatabaseService';
import { ReminderEntity } from '../../types/database';

export class ReminderRepository {
  public static async getAllReminders(): Promise<ReminderEntity[]> {
    const reminders = await db.getAll<ReminderEntity>('reminders');
    return reminders.sort((a, b) => {
      // Pending first, then by date ascending
      if (a.status !== b.status) {
        return a.status === 'pending' ? -1 : 1;
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }

  public static async getReminderById(id: string): Promise<ReminderEntity | null> {
    return db.getById<ReminderEntity>('reminders', id);
  }

  public static async addReminder(reminder: ReminderEntity): Promise<ReminderEntity> {
    return db.insert<ReminderEntity>('reminders', reminder);
  }

  public static async updateReminder(
    id: string,
    updates: Partial<ReminderEntity>,
  ): Promise<ReminderEntity | null> {
    return db.update<ReminderEntity>('reminders', id, updates);
  }

  public static async toggleStatus(id: string): Promise<ReminderEntity | null> {
    const existing = await db.getById<ReminderEntity>('reminders', id);
    if (!existing) return null;

    const newStatus = existing.status === 'pending' ? 'completed' : 'pending';
    return db.update<ReminderEntity>('reminders', id, { status: newStatus });
  }

  public static async deleteReminder(id: string): Promise<boolean> {
    return db.delete('reminders', id);
  }
}
