import { z } from "zod";

export const registerSchema = {
  body: z.object({
    email: z.string().email({ message: "Invalid email format" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    fullName: z.string().min(2, { message: "Full Name is required (minimum 2 characters)" }),
    mobileNumber: z.string().min(10, { message: "Mobile number is required (minimum 10 digits)" }),
    role: z.enum(["user", "admin"]).optional(),
  }),
};

export const loginSchema = {
  body: z.object({
    email: z.string().email({ message: "Invalid email format" }),
    password: z.string().min(1, { message: "Password is required" }),
  }),
};

export const refreshSchema = {
  body: z.object({
    refreshToken: z.string().min(1, { message: "Refresh token is required" }),
  }),
};

export const changePasswordSchema = {
  body: z.object({
    oldPassword: z.string().min(1, { message: "Old password is required" }),
    newPassword: z.string().min(6, { message: "New password must be at least 6 characters" }),
  }),
};

export const forgotPasswordSchema = {
  body: z.object({
    email: z.string().email({ message: "Invalid email format" }),
  }),
};

export const resetPasswordSchema = {
  body: z.object({
    token: z.string().min(1, { message: "Token is required" }),
    newPassword: z.string().min(6, { message: "New password must be at least 6 characters" }),
  }),
};
