import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error.js";
import { verifyAccessToken } from "../utils/security.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: "user" | "admin";
  };
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next(new AppError("Authentication token required", 401));
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded as any;
    next();
  } catch (error) {
    next(new AppError("Invalid or expired authentication token", 401));
  }
};

export const requireRole = (role: "user" | "admin") => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError("Authentication required", 401));
      return;
    }

    if (req.user.role !== role) {
      next(new AppError(`Forbidden: Requires ${role} role`, 403));
      return;
    }

    next();
  };
};
