import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { RepaymentService } from "../services/repayment.service.js";

const repaymentService = new RepaymentService();

export const getRepaymentHistory = async (req: AuthenticatedRequest, res: Response) => {
  const result = await repaymentService.getRepaymentHistory(
    req.params.loanId as string,
    req.user!.userId,
    req.user!.role
  );
  res.status(200).json({
    success: true,
    message: "Repayment history retrieved successfully",
    data: result,
  });
};

export const makeRepayment = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const { loanId, amount, paymentMethod, transactionRef, remarks, screenshotUrl } = req.body;

  const result = await repaymentService.recordRepayment(userId, {
    loanId,
    amount: Number(amount),
    paymentDate: new Date(),
    paymentMethod: paymentMethod || "upi",
    transactionRef,
    remarks: remarks || "Paid directly by user",
    screenshotUrl,
    status: "pending",
  });

  res.status(201).json({
    success: true,
    message: "Repayment submission recorded. Waiting for admin verification.",
    data: result,
  });
};
