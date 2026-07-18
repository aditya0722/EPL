import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { DocumentService } from "../services/document.service.js";
import { AppError } from "../utils/app-error.js";

const docService = new DocumentService();

export const uploadDoc = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) {
    throw new AppError("No file uploaded or file rejected", 400);
  }

  const { documentType } = req.body;
  if (!documentType) {
    throw new AppError("documentType is required", 400);
  }

  const result = await docService.uploadDocument(req.user!.userId, req.file.path, documentType);
  res.status(201).json({
    success: true,
    message: "Document uploaded successfully",
    data: result,
  });
};

export const getUserDocs = async (req: AuthenticatedRequest, res: Response) => {
  const result = await docService.getUserDocuments(req.user!.userId);
  res.status(200).json({
    success: true,
    message: "Documents retrieved successfully",
    data: result,
  });
};
