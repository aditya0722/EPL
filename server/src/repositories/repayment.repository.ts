import { db } from "../db/index.js";
import { repayments } from "../db/schema/repayments.js";
import { eq, and, desc, sql } from "drizzle-orm";
import type { DbClient } from "../db/index.js";

export class RepaymentRepository {
  private db: DbClient;

  constructor() {
    this.db = db;
  }

  async findById(id: string) {
    const result = await this.db
      .select()
      .from(repayments)
      .where(eq(repayments.id, id))
      .limit(1);
    return result[0] || null;
  }

  async findByLoanId(loanId: string) {
    return this.db
      .select()
      .from(repayments)
      .where(eq(repayments.loanId, loanId))
      .orderBy(desc(repayments.paymentDate));
  }

  async create(data: typeof repayments.$inferInsert) {
    const result = await this.db.insert(repayments).values(data).returning();
    return result[0];
  }

  async getSumByLoanId(loanId: string): Promise<number> {
    const result = await this.db
      .select({ sum: sql<string>`sum(${repayments.amount})` })
      .from(repayments)
      .where(and(eq(repayments.loanId, loanId), eq(repayments.status, "completed")));
    return Number(result[0]?.sum || 0);
  }

  async getMonthlyVolume(): Promise<{ month: string; amount: number }[]> {
    const result = await this.db
      .select({
        month: sql<string>`to_char(${repayments.paymentDate}, 'YYYY-MM')`,
        amount: sql<string>`sum(${repayments.amount})`,
      })
      .from(repayments)
      .groupBy(sql`to_char(${repayments.paymentDate}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${repayments.paymentDate}, 'YYYY-MM') desc`);

    return result.map((r) => ({
      month: r.month,
      amount: Number(r.amount || 0),
    }));
  }

  async update(id: string, data: Partial<typeof repayments.$inferInsert>) {
    const result = await this.db
      .update(repayments)
      .set(data)
      .where(eq(repayments.id, id))
      .returning();
    return result[0];
  }

  async findPending() {
    return this.db
      .select()
      .from(repayments)
      .where(eq(repayments.status, "pending"))
      .orderBy(desc(repayments.createdAt));
  }

  async findAll() {
    return this.db
      .select()
      .from(repayments)
      .orderBy(desc(repayments.createdAt));
  }
}
