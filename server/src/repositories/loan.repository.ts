import { db } from "../db/index.js";
import { loans } from "../db/schema/loans.js";
import { users } from "../db/schema/users.js";
import { eq, and, or, ilike, asc, desc, sql } from "drizzle-orm";
import type { DbClient } from "../db/index.js";

export class LoanRepository {
  private db: DbClient;

  constructor() {
    this.db = db;
  }

  async findById(id: string) {
    const result = await this.db
      .select({
        loan: loans,
        user: users,
      })
      .from(loans)
      .innerJoin(users, eq(loans.userId, users.id))
      .where(eq(loans.id, id))
      .limit(1);
    return result[0] || null;
  }

  async findByUserId(userId: string) {
    return this.db
      .select()
      .from(loans)
      .where(eq(loans.userId, userId))
      .orderBy(desc(loans.createdAt));
  }

  async create(data: typeof loans.$inferInsert) {
    const result = await this.db.insert(loans).values(data).returning();
    return result[0];
  }

  async update(id: string, data: Partial<typeof loans.$inferInsert>) {
    const result = await this.db
      .update(loans)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(loans.id, id))
      .returning();
    return result[0];
  }

  async count(options: { search?: string; status?: typeof loans.$inferSelect.status }) {
    const conditions = [];
    if (options.status) {
      conditions.push(eq(loans.status, options.status));
    }

    if (options.search) {
      const countResult = await this.db
        .select({ count: sql<number>`count(distinct ${loans.id})` })
        .from(loans)
        .innerJoin(users, eq(loans.userId, users.id))
        .where(
          and(
            ...conditions,
            or(
              ilike(users.fullName, `%${options.search}%`),
              ilike(users.email, `%${options.search}%`),
              ilike(loans.loanPurpose, `%${options.search}%`)
            )
          )
        );
      return Number(countResult[0]?.count || 0);
    }

    const result = await this.db
      .select({ count: this.db.$count(loans) })
      .from(loans)
      .where(conditions.length ? and(...conditions) : undefined);
    return result[0]?.count || 0;
  }

  async findAll(options: {
    limit: number;
    offset: number;
    search?: string;
    status?: typeof loans.$inferSelect.status;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) {
    const conditions = [];
    if (options.status) {
      conditions.push(eq(loans.status, options.status));
    }

    const allowedSortFields = ["createdAt", "loanAmount", "status"];
    const sortField = allowedSortFields.includes(options.sortBy || "") ? (options.sortBy as keyof typeof loans.$inferSelect) : "createdAt";
    const order = options.sortOrder === "asc" ? "asc" : "desc";

    const sortColumn = loans[sortField];
    const orderByDir = order === "asc" ? asc(sortColumn) : desc(sortColumn);

    if (options.search) {
      conditions.push(
        or(
          ilike(users.fullName, `%${options.search}%`),
          ilike(users.email, `%${options.search}%`),
          ilike(loans.loanPurpose, `%${options.search}%`)
        )
      );
    }

    return this.db
      .select({
        loan: loans,
        user: users,
      })
      .from(loans)
      .innerJoin(users, eq(loans.userId, users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(orderByDir)
      .limit(options.limit)
      .offset(options.offset);
  }
}
