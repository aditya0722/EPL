import { pgTable, uuid, varchar, text, timestamp, numeric, integer, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const loanStatusEnum = pgEnum("loan_status", [
  "pending",
  "under_review",
  "documents_required",
  "approved",
  "rejected",
  "disbursed",
  "closed",
  "defaulted",
  "cancelled",
]);

export const loans = pgTable("loans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  loanAmount: numeric("loan_amount", { precision: 12, scale: 2 }).notNull(),
  loanPurpose: text("loan_purpose").notNull(),
  employmentType: varchar("employment_type", { length: 100 }).notNull(),
  monthlyIncome: numeric("monthly_income", { precision: 12, scale: 2 }).notNull(),
  existingEmi: numeric("existing_emi", { precision: 12, scale: 2 }).default("0.00").notNull(),
  loanDuration: integer("loan_duration").notNull(), // in months
  repaymentType: varchar("repayment_type", { length: 20 }).default("emi").notNull(),
  interestRate: numeric("interest_rate", { precision: 5, scale: 2 }).default("12.00").notNull(),
  interestAmount: numeric("interest_amount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  processingFee: numeric("processing_fee", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalPayable: numeric("total_payable", { precision: 12, scale: 2 }).default("0.00").notNull(),
  applicationDate: timestamp("application_date").defaultNow().notNull(),
  status: loanStatusEnum("status").default("pending").notNull(),
  adminRemarks: text("admin_remarks"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
