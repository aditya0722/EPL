import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { UserService } from "../services/user.service.js";
import { AppError } from "../utils/app-error.js";
import { LoanService } from "../services/loan.service.js";
import { DocumentService } from "../services/document.service.js";
import { NotificationService } from "../services/notification.service.js";
import { RepaymentService } from "../services/repayment.service.js";

const userService = new UserService();
const loanService = new LoanService();
const docService = new DocumentService();
const notifService = new NotificationService();
const repaymentService = new RepaymentService();

export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  const result = await userService.getProfile(req.user!.userId);
  res.status(200).json({
    success: true,
    message: "Profile retrieved successfully",
    data: result,
  });
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  const result = await userService.updateProfile(req.user!.userId, req.body);
  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
};

export const getDashboard = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;

  const profile = await userService.getProfile(userId);

  const loans = await loanService.getLoanHistory(userId);
  const currentLoan = loans.find((l) =>
    ["pending", "under_review", "documents_required", "approved", "disbursed"].includes(l.status)
  ) || null;

  let repayments: any[] = [];
  let repaymentMeta = null;
  if (currentLoan) {
    const repayHistory = await repaymentService.getRepaymentHistory(currentLoan.id, userId, req.user!.role);
    repayments = repayHistory.repayments;
    repaymentMeta = {
      totalRepaid: repayHistory.totalRepaid,
      outstandingAmount: repayHistory.outstandingAmount,
      loanAmount: repayHistory.loanAmount,
    };
  }

  const uploadedDocs = await docService.getUserDocuments(userId);
  const mandatoryDocs = ["aadhaar_front", "aadhaar_back", "pan_card", "selfie"];
  const pendingDocuments = mandatoryDocs.filter((m) => {
    const found = uploadedDocs.find((d) => d.documentType === m);
    return !found || found.status === "rejected";
  });

  const notifications = await notifService.getNotifications(userId);

  res.status(200).json({
    success: true,
    message: "Dashboard retrieved successfully",
    data: {
      profileCompletion: profile.profileCompletionPercentage,
      kycStatus: profile.kycStatus,
      currentLoan,
      loanHistory: loans,
      repaymentHistory: repayments,
      repaymentMeta,
      pendingDocuments,
      notifications,
    },
  });
};

export const updatePushToken = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const { pushToken } = req.body;
  if (!pushToken || typeof pushToken !== "string") {
    throw new AppError("pushToken is required", 400);
  }
  const updatedUser = await userService.updateProfile(userId, { pushToken });
  res.status(200).json({
    success: true,
    message: "Push token updated successfully",
    data: { pushToken: updatedUser.pushToken },
  });
};
