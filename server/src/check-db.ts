import { db } from "./db/index.js";
import { users } from "./db/schema/users.js";
import { loans } from "./db/schema/loans.js";

async function main() {
  const allUsers = await db.select().from(users);
  console.log("=== USERS ===");
  allUsers.forEach((u) => {
    console.log(`ID: ${u.id} | Email: ${u.email} | KYC Status: ${u.kycStatus} | Name: ${u.fullName}`);
  });

  const allLoans = await db.select().from(loans);
  console.log("\n=== LOANS ===");
  allLoans.forEach((l) => {
    console.log(`ID: ${l.id} | UserID: ${l.userId} | Amount: ${l.loanAmount} | Status: ${l.status}`);
  });
}

main().catch(console.error).finally(() => process.exit(0));
