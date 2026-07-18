import { pgTable, uuid, varchar, text, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { loans } from "./loans.js";

export const paymentMethodEnum = pgEnum("payment_method", [
  "upi",
  "bank_transfer",
  "cash",
  "other",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "completed",
  "failed",
]);

export const repayments = pgTable("repayments", {
  id: uuid("id").primaryKey().defaultRandom(),
  loanId: uuid("loan_id")
    .references(() => loans.id, { onDelete: "cascade" })
    .notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  transactionRef: varchar("transaction_ref", { length: 100 }).notNull().unique(),
  remarks: text("remarks"),
  screenshotUrl: text("screenshot_url"),
  status: paymentStatusEnum("status").default("pending").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
