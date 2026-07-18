import { db } from "./db/index.js";
import { users } from "./db/schema/users.js";
import { hashPassword } from "./utils/security.js";
import { eq } from "drizzle-orm";

async function main() {
  const adminPassword = await hashPassword("123456");
  
  // Try inserting
  try {
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
    console.log(`Created Admin: ${admin.email}`);
  } catch (err: any) {
    if (err.code === "23505") { // unique constraint violation
      console.log("Admin already exists. Updating password and role...");
      const [updated] = await db
        .update(users)
        .set({
          password: adminPassword,
          role: "admin",
        })
        .where(eq(users.email, "admin@gmail.com" as any))
        .returning();
      console.log(`Updated Admin: ${updated.email}`);
    } else {
      console.error(err);
    }
  }
}

main().catch(console.error).finally(() => process.exit(0));
