import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { AuthService } from "../services/auth.service.js";

const authService = new AuthService();

export const register = async (req: AuthenticatedRequest, res: Response) => {
  const result = await authService.register(req.body);
  res.status(201).json({
    success: true,
    message: "Registration successful",
    data: result,
  });
};

export const login = async (req: AuthenticatedRequest, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress;
  const result = await authService.login(req.body.email, req.body.password, ip);
  res.status(200).json({
    success: true,
    message: "Login successful",
    data: result,
  });
};

export const logout = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  await authService.logout(userId);
  res.status(200).json({
    success: true,
    message: "Logout successful",
  });
};

export const refresh = async (req: AuthenticatedRequest, res: Response) => {
  const result = await authService.refreshToken(req.body.refreshToken);
  res.status(200).json({
    success: true,
    message: "Token refreshed successfully",
    data: result,
  });
};

export const changePassword = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  await authService.changePassword(userId, req.body.oldPassword, req.body.newPassword);
  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
};

export const forgotPassword = async (req: AuthenticatedRequest, res: Response) => {
  const result = await authService.forgotPassword(req.body.email);
  res.status(200).json({
    success: true,
    message: result.message,
  });
};

export const resetPassword = async (req: AuthenticatedRequest, res: Response) => {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  res.status(200).json({
    success: true,
    message: "Password reset successful",
  });
};
