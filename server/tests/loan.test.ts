import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/server.js";
import { db } from "../src/db/index.js";
import { users } from "../src/db/schema/users.js";
import { loans } from "../src/db/schema/loans.js";
import { eq, or } from "drizzle-orm";

describe("Loan Module Integration Tests", () => {
  const userEmail = `user_loan_${Date.now()}@example.com`;
  const adminEmail = `admin_loan_${Date.now()}@example.com`;
  const password = "Password123";
  let userToken: string;
  let adminToken: string;
  let loanId: string;

  beforeAll(async () => {
    await request(app).post("/api/v1/auth/register").send({
      email: userEmail,
      password,
      fullName: "Loan Test User",
      role: "user",
    });
    
    await db.update(users).set({ kycStatus: "verified" }).where(eq(users.email, userEmail));

    await request(app).post("/api/v1/auth/register").send({
      email: adminEmail,
      password,
      fullName: "Loan Test Admin",
      role: "admin",
    });

    const userLogin = await request(app).post("/api/v1/auth/login").send({ email: userEmail, password });
    userToken = userLogin.body.data.accessToken;

    const adminLogin = await request(app).post("/api/v1/auth/login").send({ email: adminEmail, password });
    adminToken = adminLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await db.delete(users).where(or(eq(users.email, userEmail), eq(users.email, adminEmail)));
  });

  it("should fail loan application with amount below ₹5,000", async () => {
    const res = await request(app)
      .post("/api/v1/loans/apply")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        loanAmount: 4000,
        loanPurpose: "Buy a phone",
        employmentType: "salaried",
        monthlyIncome: 30000,
        loanDuration: 6,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should fail loan application with amount above ₹50,000", async () => {
    const res = await request(app)
      .post("/api/v1/loans/apply")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        loanAmount: 60000,
        loanPurpose: "Buy a car",
        employmentType: "salaried",
        monthlyIncome: 30000,
        loanDuration: 6,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should successfully apply for a loan with valid amount", async () => {
    const res = await request(app)
      .post("/api/v1/loans/apply")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        loanAmount: 20000,
        loanPurpose: "Medical billing",
        employmentType: "salaried",
        monthlyIncome: 35000,
        loanDuration: 12,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe("pending");
    loanId = res.body.data.id;
  });

  it("should prevent duplicate loan applications", async () => {
    const res = await request(app)
      .post("/api/v1/loans/apply")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        loanAmount: 10000,
        loanPurpose: "Another loan",
        employmentType: "salaried",
        monthlyIncome: 35000,
        loanDuration: 6,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("already have an active loan");
  });

  it("should allow admin to retrieve and approve the loan", async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/loans/${loanId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "approved",
        remarks: "Approved for medical request",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("approved");
  });
});
