import { db } from "../db/index.js";
import { auditLogs } from "../db/schema/audit_logs.js";
import { users } from "../db/schema/users.js";
import { eq, desc } from "drizzle-orm";
import type { DbClient } from "../db/index.js";

export class AuditRepository {
  private db: DbClient;

  constructor() {
    this.db = db;
  }

  async create(data: typeof auditLogs.$inferInsert) {
    const result = await this.db.insert(auditLogs).values(data).returning();
    return result[0];
  }

  async findRecent(limit: number = 10) {
    return this.db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        details: auditLogs.details,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
        user: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
        },
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }
}
