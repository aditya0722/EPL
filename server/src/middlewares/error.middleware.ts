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
  logger.error("Error occurred: %o", err);

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
