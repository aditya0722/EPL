import { UserRepository } from "../repositories/user.repository.js";
import { AuditRepository } from "../repositories/audit.repository.js";
import { AppError } from "../utils/app-error.js";
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/security.js";
import { logger } from "../utils/logger.js";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { users } from "../db/schema/users.js";

export class AuthService {
  private userRepo: UserRepository;
  private auditRepo: AuditRepository;

  constructor() {
    this.userRepo = new UserRepository();
    this.auditRepo = new AuditRepository();
  }

  async register(data: typeof users.$inferInsert) {
    const existing = await this.userRepo.findByEmail(data.email);
    if (existing) {
      throw new AppError("Email already in use", 400);
    }

    const hashedPassword = await hashPassword(data.password);
    const user = await this.userRepo.create({
      ...data,
      password: hashedPassword,
    });

    await this.auditRepo.create({
      userId: user.id,
      action: "user_registration",
      details: { email: user.email },
    });

    const { password, refreshToken, ...userWithoutSensitiveFields } = user;
    return userWithoutSensitiveFields;
  }

  async login(email: string, passwordText: string, ipAddress?: string) {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    const matches = await comparePassword(passwordText, user.password);
    if (!matches) {
      throw new AppError("Invalid email or password", 401);
    }

    const accessToken = generateAccessToken({ userId: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id });

    await this.userRepo.update(user.id, { refreshToken });

    await this.auditRepo.create({
      userId: user.id,
      action: user.role === "admin" ? "admin_login" : "user_login",
      details: { email: user.email },
      ipAddress,
    });

    const { password, refreshToken: _, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  async logout(userId: string) {
    await this.userRepo.update(userId, { refreshToken: null });
    await this.auditRepo.create({
      userId,
      action: "user_logout",
      details: {},
    });
  }

  async refreshToken(token: string) {
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      throw new AppError("Invalid refresh token", 401);
    }

    const user = await this.userRepo.findByRefreshToken(token);
    if (!user || user.id !== decoded.userId) {
      throw new AppError("Invalid refresh token or session expired", 401);
    }

    const newAccessToken = generateAccessToken({ userId: user.id, role: user.role });
    const newRefreshToken = generateRefreshToken({ userId: user.id });

    await this.userRepo.update(user.id, { refreshToken: newRefreshToken });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async changePassword(userId: string, oldPasswordText: string, newPasswordText: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const matches = await comparePassword(oldPasswordText, user.password);
    if (!matches) {
      throw new AppError("Incorrect old password", 400);
    }

    const newHashed = await hashPassword(newPasswordText);
    await this.userRepo.update(userId, { password: newHashed });

    await this.auditRepo.create({
      userId,
      action: "password_change",
      details: {},
    });
  }

  async forgotPassword(email: string) {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      return { message: "If the email is registered, a password reset link has been sent." };
    }

    const resetToken = jwt.sign({ userId: user.id }, env.JWT_SECRET, { expiresIn: "1h" });
    logger.warn(`[MOCK EMAIL SERVICE] Password reset requested for ${email}. Reset Token: ${resetToken}`);

    await this.auditRepo.create({
      userId: user.id,
      action: "password_reset_request",
      details: { email },
    });

    return { message: "Reset token generated successfully (check server logs)." };
  }

  async resetPassword(token: string, newPasswordText: string) {
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    } catch (err) {
      throw new AppError("Invalid or expired reset token", 400);
    }

    const user = await this.userRepo.findById(decoded.userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const newHashed = await hashPassword(newPasswordText);
    await this.userRepo.update(user.id, { password: newHashed, refreshToken: null });

    await this.auditRepo.create({
      userId: user.id,
      action: "password_reset_success",
      details: {},
    });
  }
}
