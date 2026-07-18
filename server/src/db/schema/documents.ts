import { pgTable, uuid, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const documentTypeEnum = pgEnum("document_type", [
  "aadhaar_front",
  "aadhaar_back",
  "pan_card",
  "selfie",
  "salary_slip",
  "bank_statement",
  "other",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "pending",
  "approved",
  "rejected",
]);

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  documentType: documentTypeEnum("document_type").notNull(),
  cloudinaryUrl: text("cloudinary_url").notNull(),
  status: documentStatusEnum("status").default("pending").notNull(),
  adminRemarks: text("admin_remarks"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
