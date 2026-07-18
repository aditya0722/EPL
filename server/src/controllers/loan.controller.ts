import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { LoanService } from "../services/loan.service.js";
import { RepaymentService } from "../services/repayment.service.js";

const loanService = new LoanService();
const repaymentService = new RepaymentService();

export const applyLoan = async (req: AuthenticatedRequest, res: Response) => {
  const result = await loanService.applyForLoan(req.user!.userId, req.body);
  res.status(201).json({
    success: true,
    message: "Loan application submitted successfully",
    data: result,
  });
};

export const getLoanDetails = async (req: AuthenticatedRequest, res: Response) => {
  const result = await loanService.getLoanDetails(req.params.id as string, req.user!.userId, req.user!.role);
  
  const repayHistory = await repaymentService.getRepaymentHistory(req.params.id as string, result.loan.userId, req.user!.role);

  res.status(200).json({
    success: true,
    message: "Loan details retrieved successfully",
    data: {
      loan: result.loan,
      user: result.user,
      repayments: repayHistory.repayments,
      repaymentMeta: {
        totalRepaid: repayHistory.totalRepaid,
        outstandingAmount: repayHistory.outstandingAmount,
        loanAmount: repayHistory.loanAmount,
      }
    },
  });
};

export const getLoanHistory = async (req: AuthenticatedRequest, res: Response) => {
  const result = await loanService.getLoanHistory(req.user!.userId);
  res.status(200).json({
    success: true,
    message: "Loan history retrieved successfully",
    data: result,
  });
};
