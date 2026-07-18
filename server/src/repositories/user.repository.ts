import { db } from "../db/index.js";
import { users } from "../db/schema/users.js";
import { eq, and, or, ilike, isNull, asc, desc } from "drizzle-orm";
import type { DbClient } from "../db/index.js";

export class UserRepository {
  private db: DbClient;

  constructor() {
    this.db = db;
  }

  async findById(id: string) {
    const result = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);
    return result[0] || null;
  }

  async findByEmail(email: string) {
    const result = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);
    return result[0] || null;
  }

  async findByRefreshToken(token: string) {
    const result = await this.db
      .select()
      .from(users)
      .where(and(eq(users.refreshToken, token), isNull(users.deletedAt)))
      .limit(1);
    return result[0] || null;
  }

  async create(data: typeof users.$inferInsert) {
    const result = await this.db.insert(users).values(data).returning();
    return result[0];
  }

  async update(id: string, data: Partial<typeof users.$inferInsert>) {
    const result = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string) {
    const result = await this.db
      .update(users)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async count(options: { search?: string; kycStatus?: "pending" | "submitted" | "verified" | "rejected" }) {
    const conditions = [isNull(users.deletedAt)];
    if (options.kycStatus) {
      conditions.push(eq(users.kycStatus, options.kycStatus));
    }
    if (options.search) {
      const searchCondition = or(
        ilike(users.fullName, `%${options.search}%`),
        ilike(users.email, `%${options.search}%`),
        ilike(users.mobileNumber, `%${options.search}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }
    const result = await this.db
      .select({ count: this.db.$count(users) })
      .from(users)
      .where(and(...conditions));
    return result[0]?.count || 0;
  }

  async findAll(options: {
    limit: number;
    offset: number;
    search?: string;
    kycStatus?: "pending" | "submitted" | "verified" | "rejected";
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) {
    const conditions = [isNull(users.deletedAt)];
    if (options.kycStatus) {
      conditions.push(eq(users.kycStatus, options.kycStatus));
    }
    if (options.search) {
      const searchCondition = or(
        ilike(users.fullName, `%${options.search}%`),
        ilike(users.email, `%${options.search}%`),
        ilike(users.mobileNumber, `%${options.search}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const allowedSortFields = ["createdAt", "fullName", "email"];
    const sortField = allowedSortFields.includes(options.sortBy || "") ? (options.sortBy as keyof typeof users.$inferSelect) : "createdAt";
    const order = options.sortOrder === "asc" ? "asc" : "desc";

    const sortColumn = users[sortField];
    const orderByDir = order === "asc" ? asc(sortColumn) : desc(sortColumn);

    return this.db
      .select()
      .from(users)
      .where(and(...conditions))
      .orderBy(orderByDir)
      .limit(options.limit)
      .offset(options.offset);
  }
}
