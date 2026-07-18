import { db } from "./index.js";
import { users } from "./schema/users.js";
import { loans } from "./schema/loans.js";
import { repayments } from "./schema/repayments.js";
import { notifications } from "./schema/notifications.js";
import { hashPassword } from "../utils/security.js";
import { logger } from "../utils/logger.js";

async function main() {
  logger.info("Starting seed process...");

  const adminPassword = await hashPassword("123456");
  const userPassword = await hashPassword("UserPass123");

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

  logger.info(`Seeded Admin: ${admin.email}`);

  const [user1] = await db
    .insert(users)
    .values({
      email: "rahul@gmail.com",
      password: userPassword,
      role: "user",
      fullName: "Rahul Sharma",
      mobileNumber: "9812345678",
      dob: new Date("1995-05-15"),
      gender: "male",
      panNumber: "ABCDE1234F",
      aadhaarNumber: "123456789012",
      address: "123, Main Street, Delhi",
      occupation: "Software Engineer",
      monthlyIncome: "60000.00",
      bankAccountNo: "9182736455",
      bankIfsc: "SBIN0001234",
      kycStatus: "verified",
    })
    .returning();

  logger.info(`Seeded User 1: ${user1.email}`);

  const [user2] = await db
    .insert(users)
    .values({
      email: "priya@gmail.com",
      password: userPassword,
      role: "user",
      fullName: "Priya Patel",
      mobileNumber: "9765432109",
      dob: new Date("1998-09-22"),
      gender: "female",
      panNumber: "XYZWV9876A",
      aadhaarNumber: "987654321098",
      address: "456, GIDC, Ahmedabad",
      occupation: "Business Owner",
      monthlyIncome: "45000.00",
      bankAccountNo: "1122334455",
      bankIfsc: "ICIC0005678",
      kycStatus: "submitted",
    })
    .returning();

  logger.info(`Seeded User 2: ${user2.email}`);

  const [loan1] = await db
    .insert(loans)
    .values({
      userId: user1.id,
      loanAmount: "25000.00",
      loanPurpose: "Medical emergency expenses",
      employmentType: "salaried",
      monthlyIncome: "60000.00",
      existingEmi: "0.00",
      loanDuration: 12,
      status: "disbursed",
    })
    .returning();

  const [loan2] = await db
    .insert(loans)
    .values({
      userId: user2.id,
      loanAmount: "10000.00",
      loanPurpose: "Education purchase",
      employmentType: "self-employed",
      monthlyIncome: "45000.00",
      existingEmi: "1500.00",
      loanDuration: 6,
      status: "pending",
    })
    .returning();

  logger.info("Seeded Sample Loans");

  await db.insert(repayments).values({
    loanId: loan1.id,
    amount: "5000.00",
    paymentDate: new Date(),
    paymentMethod: "upi",
    transactionRef: "TXN123456789",
    remarks: "First month installment",
    status: "completed",
  });

  logger.info("Seeded Sample Repayments");

  await db.insert(notifications).values([
    {
      userId: user1.id,
      title: "Loan Disbursed 💰",
      message: "Your loan of ₹25,000 has been disbursed to your account.",
      type: "loan_approved",
    },
    {
      userId: user2.id,
      title: "KYC Submitted",
      message: "Your KYC details are submitted and are under review.",
      type: "kyc_verified",
    },
  ]);

  logger.info("Seeded Notifications");
  logger.info("Seed process completed successfully.");
  process.exit(0);
}

main().catch((err) => {
  logger.error("Seed failed: %o", err);
  process.exit(1);
});
