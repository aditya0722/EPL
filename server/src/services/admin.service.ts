import { db } from "../db/index.js";
import { loans } from "../db/schema/loans.js";
import { users } from "../db/schema/users.js";
import { repayments } from "../db/schema/repayments.js";
import { AuditRepository } from "../repositories/audit.repository.js";
import { eq, and, sql } from "drizzle-orm";

export class AdminService {
  private auditRepo: AuditRepository;

  constructor() {
    this.auditRepo = new AuditRepository();
  }

  async getDashboardStats() {
    const totalCustomersResult = await db
      .select({ count: db.$count(users) })
      .from(users)
      .where(eq(users.role, "user"));
    const totalCustomers = totalCustomersResult[0]?.count || 0;

    const statusCounts = await db
      .select({
        status: loans.status,
        count: sql<number>`count(${loans.id})`,
        amount: sql<string>`sum(${loans.loanAmount})`,
      })
      .from(loans)
      .groupBy(loans.status);

    const stats = {
      pendingLoans: 0,
      approvedLoans: 0,
      rejectedLoans: 0,
      disbursedLoans: 0,
      disbursedAmount: 0,
      closedLoans: 0,
      defaultedLoans: 0,
    };

    statusCounts.forEach((s) => {
      if (s.status === "pending") stats.pendingLoans = Number(s.count);
      else if (s.status === "approved") stats.approvedLoans = Number(s.count);
      else if (s.status === "rejected") stats.rejectedLoans = Number(s.count);
      else if (s.status === "closed") stats.closedLoans = Number(s.count);
      else if (s.status === "defaulted") stats.defaultedLoans = Number(s.count);
      else if (s.status === "disbursed") {
        stats.disbursedLoans = Number(s.count);
        stats.disbursedAmount = Number(s.amount || 0);
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAppsResult = await db
      .select({ count: db.$count(loans) })
      .from(loans)
      .where(sql`${loans.createdAt} >= ${today}`);
    const todaysApplications = todayAppsResult[0]?.count || 0;

    const pendingKycResult = await db
      .select({ count: db.$count(users) })
      .from(users)
      .where(and(eq(users.role, "user"), eq(users.kycStatus, "submitted")));
    const pendingVerifications = pendingKycResult[0]?.count || 0;

    const totalRepaymentsResult = await db
      .select({ sum: sql<string>`sum(${repayments.amount})` })
      .from(repayments);
    const totalRepayments = Number(totalRepaymentsResult[0]?.sum || 0);

    const outstandingAmount = Math.max(0, stats.disbursedAmount - totalRepayments);

    const monthlyDisbursals = await db
      .select({
        month: sql<string>`to_char(${loans.updatedAt}, 'YYYY-MM')`,
        amount: sql<string>`sum(${loans.loanAmount})`,
      })
      .from(loans)
      .where(eq(loans.status, "disbursed"))
      .groupBy(sql`to_char(${loans.updatedAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${loans.updatedAt}, 'YYYY-MM') desc`);

    const monthlyRepayments = await db
      .select({
        month: sql<string>`to_char(${repayments.paymentDate}, 'YYYY-MM')`,
        amount: sql<string>`sum(${repayments.amount})`,
      })
      .from(repayments)
      .groupBy(sql`to_char(${repayments.paymentDate}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${repayments.paymentDate}, 'YYYY-MM') desc`);

    const recentActivities = await this.auditRepo.findRecent(15);

    return {
      totalCustomers,
      todaysApplications,
      pendingVerifications,
      outstandingAmount,
      totalRepayments,
      loansStats: stats,
      monthlyDisbursals: monthlyDisbursals.map((d) => ({ month: d.month, amount: Number(d.amount || 0) })),
      monthlyRepayments: monthlyRepayments.map((r) => ({ month: r.month, amount: Number(r.amount || 0) })),
      recentActivities,
    };
  }
}
