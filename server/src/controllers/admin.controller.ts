import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { AdminService } from "../services/admin.service.js";
import { LoanService } from "../services/loan.service.js";
import { RepaymentService } from "../services/repayment.service.js";
import { DocumentService } from "../services/document.service.js";
import { AppError } from "../utils/app-error.js";

const adminService = new AdminService();
const loanService = new LoanService();
const repaymentService = new RepaymentService();
const docService = new DocumentService();

export const getDashboardStats = async (_req: AuthenticatedRequest, res: Response) => {
  const result = await adminService.getDashboardStats();
  res.status(200).json({
    success: true,
    message: "Admin dashboard stats retrieved successfully",
    data: result,
  });
};

export const getLoans = async (req: AuthenticatedRequest, res: Response) => {
  const { limit, offset, search, status, sortBy, sortOrder } = req.query as any;
  const result = await loanService.getAdminLoans({
    limit,
    offset,
    search,
    status,
    sortBy,
    sortOrder,
  });
  res.status(200).json({
    success: true,
    message: "Loans retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
};

export const updateLoanStatus = async (req: AuthenticatedRequest, res: Response) => {
  const adminId = req.user!.userId;
  const loanId = req.params.id as string;
  const { status, remarks } = req.body;
  const result = await loanService.updateLoanStatusByAdmin(adminId, loanId, status, remarks);
  res.status(200).json({
    success: true,
    message: `Loan status updated to ${status}`,
    data: result,
  });
};

export const recordRepayment = async (req: AuthenticatedRequest, res: Response) => {
  const adminId = req.user!.userId;
  const { loanId, amount, paymentDate, paymentMethod, transactionRef, remarks } = req.body;
  const result = await repaymentService.recordRepayment(adminId, {
    loanId,
    amount,
    paymentDate,
    paymentMethod,
    transactionRef,
    remarks,
  });
  res.status(201).json({
    success: true,
    message: "Repayment recorded successfully",
    data: result,
  });
};

export const verifyDocument = async (req: AuthenticatedRequest, res: Response) => {
  const adminId = req.user!.userId;
  const docId = req.params.id as string;
  const { status, remarks } = req.body;
  const result = await docService.verifyDocumentByAdmin(adminId, docId, status, remarks);
  res.status(200).json({
    success: true,
    message: `Document status updated to ${status}`,
    data: result,
  });
};

import { UserRepository } from "../repositories/user.repository.js";
const userRepo = new UserRepository();

export const getUsers = async (req: AuthenticatedRequest, res: Response) => {
  const { search, kycStatus } = req.query as any;
  const result = await userRepo.findAll({
    limit: 100,
    offset: 0,
    search,
    kycStatus,
  });
  res.status(200).json({
    success: true,
    message: "Users retrieved successfully",
    data: result,
  });
};

export const getUserDocuments = async (req: AuthenticatedRequest, res: Response) => {
  const result = await docService.getUserDocuments(req.params.id as string);
  res.status(200).json({
    success: true,
    message: "User documents retrieved successfully",
    data: result,
  });
};

export const verifyUserKyc = async (req: AuthenticatedRequest, res: Response) => {
  const adminId = req.user!.userId;
  const userId = req.params.id as string;
  const { status } = req.body;
  const user = await userRepo.update(userId, { kycStatus: status });

  if (status === "verified") {
    const userDocs = await docService.getUserDocuments(userId);
    for (const doc of userDocs) {
      if (doc.status === "pending") {
        await docService.verifyDocumentByAdmin(adminId, doc.id, "approved", "Bulk approved by admin");
      }
    }
  }

  res.status(200).json({
    success: true,
    message: `User KYC status updated to ${status}`,
    data: user,
  });
};

export const getPendingRepayments = async (_req: AuthenticatedRequest, res: Response) => {
  const result = await repaymentService.getPendingRepayments();
  res.status(200).json({
    success: true,
    message: "Pending repayments retrieved successfully",
    data: result,
  });
};

export const verifyRepayment = async (req: AuthenticatedRequest, res: Response) => {
  const adminId = req.user!.userId;
  const repaymentId = req.params.id as string;
  const { status, remarks } = req.body;

  if (status !== "completed" && status !== "failed") {
    throw new AppError("Invalid verification status", 400);
  }

  const result = await repaymentService.verifyRepayment(adminId, repaymentId, status, remarks);
  res.status(200).json({
    success: true,
    message: `Repayment updated to ${status}`,
    data: result,
  });
};
