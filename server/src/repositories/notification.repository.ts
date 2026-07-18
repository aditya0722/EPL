import { db } from "../db/index.js";
import { notifications } from "../db/schema/notifications.js";
import { eq, and, desc } from "drizzle-orm";
import type { DbClient } from "../db/index.js";

export class NotificationRepository {
  private db: DbClient;

  constructor() {
    this.db = db;
  }

  async create(data: typeof notifications.$inferInsert) {
    const result = await this.db.insert(notifications).values(data).returning();
    return result[0];
  }

  async findByUserId(userId: string) {
    return this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markAsRead(id: string, userId: string) {
    const result = await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return result[0] || null;
  }

  async markAllAsRead(userId: string) {
    return this.db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId))
      .returning();
  }
}
