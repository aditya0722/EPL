import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/server.js";
import { db } from "../src/db/index.js";
import { users } from "../src/db/schema/users.js";
import { eq } from "drizzle-orm";

describe("Authentication Integration Tests", () => {
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = "Password123";

  beforeAll(async () => {
    await db.delete(users).where(eq(users.email, testEmail));
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.email, testEmail));
  });

  it("should successfully register a new user", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: testEmail,
        password: testPassword,
        fullName: "Test User",
        mobileNumber: "+919999999999",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testEmail);
    expect(res.body.data.role).toBe("user");
  });

  it("should fail to register user with same email", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: testEmail,
        password: testPassword,
        fullName: "Test User Duplicate",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Email already in use");
  });

  it("should fail validation for weak password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: `invalid_${Date.now()}@example.com`,
        password: "123",
        fullName: "Short Password",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it("should login successfully with valid credentials", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });
});
