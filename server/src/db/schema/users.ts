import { pgTable, uuid, varchar, text, timestamp, boolean, pgEnum, numeric } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const kycStatusEnum = pgEnum("kyc_status", ["pending", "submitted", "verified", "rejected"]);
export const genderEnum = pgEnum("gender", ["male", "female", "other"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").default("user").notNull(),
  
  // Profile Details
  fullName: varchar("full_name", { length: 255 }),
  mobileNumber: varchar("mobile_number", { length: 20 }),
  dob: timestamp("dob"),
  gender: genderEnum("gender"),
  panNumber: varchar("pan_number", { length: 10 }),
  aadhaarNumber: varchar("aadhaar_number", { length: 12 }),
  address: text("address"),
  state: varchar("state", { length: 100 }),
  district: varchar("district", { length: 100 }),
  pincode: varchar("pincode", { length: 10 }),
  occupation: varchar("occupation", { length: 255 }),
  monthlyIncome: numeric("monthly_income", { precision: 12, scale: 2 }),
  bankAccountNo: varchar("bank_account_no", { length: 50 }),
  bankIfsc: varchar("bank_ifsc", { length: 20 }),
  bankName: varchar("bank_name", { length: 150 }),
  upiId: varchar("upi_id", { length: 100 }),
  emergencyContact: varchar("emergency_contact", { length: 255 }),
  profilePhotoUrl: text("profile_photo_url"),
  
  kycStatus: kycStatusEnum("kyc_status").default("pending").notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  refreshToken: text("refresh_token"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});
