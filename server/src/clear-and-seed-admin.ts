import { db } from "./db/index.js";
import { users } from "./db/schema/users.js";
import { loans } from "./db/schema/loans.js";
import { repayments } from "./db/schema/repayments.js";
import { notifications } from "./db/schema/notifications.js";
import { documents } from "./db/schema/documents.js";
import { auditLogs } from "./db/schema/audit_logs.js";
import { hashPassword } from "./utils/security.js";
import { logger } from "./utils/logger.js";
import { sql } from "drizzle-orm";

async function main() {
  logger.info("Clearing all database tables...");

  // Delete all records in correct dependency order or using TRUNCATE CASCADE
  await db.execute(sql`TRUNCATE TABLE repayments, notifications, documents, loans, audit_logs, users CASCADE;`);
  
  logger.info("All database tables cleared successfully.");

  logger.info("Seeding Admin account...");
  const adminPassword = await hashPassword("AdminEPC@123");

  const [admin] = await db
    .insert(users)
    .values({
      email: "admin@gmail.com",
      password: adminPassword,
      role: "admin",
      fullName: "System Admin",
      mobileNumber: "9876543210",
      kycStatus: "verified",
    })
    .returning();

  logger.info(`Admin created successfully: Email=${admin.email}`);
  console.log("------------------------------------------");
  console.log("Database cleared and Admin created successfully!");
  console.log(`Email: admin@gmail.com`);
  console.log(`Password: AdminEPC@123`);
  console.log("------------------------------------------");
  process.exit(0);
}

main().catch((err) => {
  logger.error("Failed to clear and seed admin: %o", err);
  console.error(err);
  process.exit(1);
});
