import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error.js";
import { logger } from "../utils/logger.js";
import { ZodError } from "zod";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || (err instanceof ZodError || err.name === "ZodError" ? 400 : 500);

  if (statusCode >= 500) {
    logger.error("Internal Server Error occurred: %o", err);
  } else {
    logger.warn(`Operational Client Error (${statusCode}) on ${req.method} ${req.originalUrl}: ${err.message || "Validation failed"}`);
  }

  if (err instanceof ZodError || err.name === "ZodError") {
    const errors = (err.errors || []).map((e: any) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
    return;
  }

  if (err instanceof AppError || (err.statusCode && err.isOperational)) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || [],
    });
    return;
  }

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    errors: process.env.NODE_ENV === "development" ? [err.message] : [],
  });
};
