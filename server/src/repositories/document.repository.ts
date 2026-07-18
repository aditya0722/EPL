import { db } from "../db/index.js";
import { documents } from "../db/schema/documents.js";
import { eq, and, desc } from "drizzle-orm";
import type { DbClient } from "../db/index.js";

export class DocumentRepository {
  private db: DbClient;

  constructor() {
    this.db = db;
  }

  async findById(id: string) {
    const result = await this.db
      .select()
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);
    return result[0] || null;
  }

  async findByUserId(userId: string) {
    return this.db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.createdAt));
  }

  async findByUserIdAndType(userId: string, type: typeof documents.$inferSelect.documentType) {
    const result = await this.db
      .select()
      .from(documents)
      .where(and(eq(documents.userId, userId), eq(documents.documentType, type)))
      .orderBy(desc(documents.createdAt))
      .limit(1);
    return result[0] || null;
  }

  async create(data: typeof documents.$inferInsert) {
    const result = await this.db.insert(documents).values(data).returning();
    return result[0];
  }

  async update(id: string, data: Partial<typeof documents.$inferInsert>) {
    const result = await this.db
      .update(documents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return result[0];
  }
}
