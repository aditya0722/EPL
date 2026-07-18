import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/server.js";
import { db } from "../src/db/index.js";
import { users } from "../src/db/schema/users.js";
import { eq, or } from "drizzle-orm";

describe("Repayment Module Integration Tests", () => {
  const userEmail = `user_repay_${Date.now()}@example.com`;
  const adminEmail = `admin_repay_${Date.now()}@example.com`;
  const password = "Password123";
  let userToken: string;
  let adminToken: string;
  let loanId: string;

  beforeAll(async () => {
    // 1. Create user and admin
    await request(app).post("/api/v1/auth/register").send({
      email: userEmail,
      password,
      fullName: "Repay Test User",
      role: "user",
    });

    await db.update(users).set({ kycStatus: "verified" }).where(eq(users.email, userEmail));

    await request(app).post("/api/v1/auth/register").send({
      email: adminEmail,
      password,
      fullName: "Repay Test Admin",
      role: "admin",
    });

    // 2. Login both to get tokens
    const userLogin = await request(app).post("/api/v1/auth/login").send({ email: userEmail, password });
    userToken = userLogin.body.data.accessToken;

    const adminLogin = await request(app).post("/api/v1/auth/login").send({ email: adminEmail, password });
    adminToken = adminLogin.body.data.accessToken;

    // 3. Apply for a loan as user
    const loanApply = await request(app)
      .post("/api/v1/loans/apply")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        loanAmount: 10000,
        loanPurpose: "Laptop repair",
        employmentType: "salaried",
        monthlyIncome: 45000,
        loanDuration: 6,
      });
    loanId = loanApply.body.data.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(users).where(or(eq(users.email, userEmail), eq(users.email, adminEmail)));
  });

  it("should prevent recording repayment if caller is not an admin", async () => {
    const res = await request(app)
      .post("/api/v1/admin/payments")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        loanId,
        amount: 2000,
        paymentDate: new Date().toISOString(),
        paymentMethod: "upi",
        transactionRef: "TXN12345",
        remarks: "Attempted by user",
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should prevent recording repayment for a non-disbursed loan", async () => {
    const res = await request(app)
      .post("/api/v1/admin/payments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        loanId,
        amount: 2000,
        paymentDate: new Date().toISOString(),
        paymentMethod: "upi",
        transactionRef: "TXN123456",
        remarks: "Attempted for pending loan",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Payments can only be recorded for disbursed or defaulted loans");
  });

  it("should allow admin to approve and disburse the loan", async () => {
    // Approve the loan
    const approveRes = await request(app)
      .patch(`/api/v1/admin/loans/${loanId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "approved",
        remarks: "Approved for laptop repair",
      });
    expect(approveRes.status).toBe(200);

    // Disburse the loan
    const disburseRes = await request(app)
      .patch(`/api/v1/admin/loans/${loanId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "disbursed",
        remarks: "Funds disbursed",
      });
    expect(disburseRes.status).toBe(200);
    expect(disburseRes.body.data.status).toBe("disbursed");
  });

  it("should successfully record a partial repayment and update outstanding amount", async () => {
    const res = await request(app)
      .post("/api/v1/admin/payments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        loanId,
        amount: 4000,
        paymentDate: new Date().toISOString(),
        paymentMethod: "upi",
        transactionRef: "TXN4000UPI",
        remarks: "Partial repayment",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.outstandingAmount).toBe(6000);
    expect(res.body.data.status).toBe("disbursed");
  });

  it("should allow user to retrieve repayment history for their own loan", async () => {
    const res = await request(app)
      .get(`/api/v1/repayments/${loanId}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalRepaid).toBe(4000);
    expect(res.body.data.outstandingAmount).toBe(6000);
    expect(res.body.data.repayments.length).toBe(1);
    expect(res.body.data.repayments[0].transactionRef).toBe("TXN4000UPI");
  });

  it("should successfully close the loan when repayment meets outstanding amount", async () => {
    const res = await request(app)
      .post("/api/v1/admin/payments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        loanId,
        amount: 6000,
        paymentDate: new Date().toISOString(),
        paymentMethod: "bank_transfer",
        transactionRef: "TXN6000BANK",
        remarks: "Closing repayment",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.outstandingAmount).toBe(0);
    expect(res.body.data.status).toBe("closed");
  });

  it("should show full repayment history and closed status on retrieval", async () => {
    const res = await request(app)
      .get(`/api/v1/repayments/${loanId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalRepaid).toBe(10000);
    expect(res.body.data.outstandingAmount).toBe(0);
    expect(res.body.data.repayments.length).toBe(2);
  });
});
