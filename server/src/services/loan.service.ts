import { LoanRepository } from "../repositories/loan.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { AuditRepository } from "../repositories/audit.repository.js";
import { NotificationService } from "./notification.service.js";
import { UserService } from "./user.service.js";
import { AppError } from "../utils/app-error.js";
import { loans } from "../db/schema/loans.js";

export class LoanService {
  private loanRepo: LoanRepository;
  private userRepo: UserRepository;
  private auditRepo: AuditRepository;
  private notificationService: NotificationService;

  constructor() {
    this.loanRepo = new LoanRepository();
    this.userRepo = new UserRepository();
    this.auditRepo = new AuditRepository();
    this.notificationService = new NotificationService();
  }

  async applyForLoan(userId: string, data: { 
    loanAmount: number; 
    loanPurpose: string; 
    employmentType: string; 
    monthlyIncome: number; 
    existingEmi?: number; 
    loanDuration: number;
    repaymentType: "emi" | "full_payment";
  }) {
    if (data.loanAmount < 5000 || data.loanAmount > 25000) {
      throw new AppError("Loan amount must be between ₹5,000 and ₹25,000", 400);
    }

    if (data.loanDuration < 1 || data.loanDuration > 12) {
      throw new AppError("Loan duration must be between 1 and 12 months", 400);
    }

    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Verify profile is 100% complete and KYC is verified
    const userService = new UserService();
    const profile = await userService.getProfile(userId);
    if (profile.profileCompletionPercentage < 100) {
      throw new AppError("Loan application requires 100% profile completion. Please complete your profile details first.", 400);
    }
    if (user.kycStatus !== "verified") {
      throw new AppError("Loan application requires approved KYC verification. Your current KYC status is: " + user.kycStatus, 400);
    }

    const userLoans = await this.loanRepo.findByUserId(userId);
    const activeLoan = userLoans.find((l) =>
      ["pending", "under_review", "documents_required", "approved", "disbursed"].includes(l.status)
    );

    if (activeLoan) {
      throw new AppError(`You already have an active loan application with status: ${activeLoan.status}`, 400);
    }

    const repaymentType = data.repaymentType || "emi";
    const interestRate = repaymentType === "emi" ? 40 : (8 * data.loanDuration); // EMI interest is 40% flat, Normal is 8% per month
    const interestAmount = Math.round(data.loanAmount * (interestRate / 100));
    const totalPayable = data.loanAmount + interestAmount;

    // Processing fee logic: 5k-7k = 450, 8k-10k = 900
    const getProcessingFee = (amt: number) => {
      if (amt >= 5000 && amt <= 7000) return 450;
      if (amt >= 8000 && amt <= 10000) return 900;
      return 0;
    };
    const processingFee = getProcessingFee(data.loanAmount);

    const loan = await this.loanRepo.create({
      userId,
      loanAmount: data.loanAmount.toString(),
      loanPurpose: data.loanPurpose,
      employmentType: data.employmentType,
      monthlyIncome: data.monthlyIncome.toString(),
      existingEmi: (data.existingEmi || 0).toString(),
      loanDuration: repaymentType === "emi" ? 3 : data.loanDuration,
      repaymentType,
      interestRate: interestRate.toFixed(2),
      interestAmount: interestAmount.toFixed(2),
      processingFee: processingFee.toFixed(2), // Store calculated fee
      totalPayable: totalPayable.toFixed(2),
      status: "pending",
    });

    await this.auditRepo.create({
      userId,
      action: "loan_application",
      details: { loanId: loan.id, amount: loan.loanAmount },
    });

    await this.notificationService.notify(
      userId,
      "Loan Application Received",
      `Your loan application for ₹${data.loanAmount} is currently pending review.`,
      "admin_message"
    );

    await this.notificationService.notifyAdmins(
      "New Loan Application Submitted 📥",
      `${user.fullName || user.email} submitted a new loan application of ₹${data.loanAmount}.`,
      "admin_message",
      { loanId: loan.id, userId }
    );

    return loan;
  }

  async getLoanHistory(userId: string) {
    return this.loanRepo.findByUserId(userId);
  }

  async getLoanDetails(id: string, userId: string, role: string) {
    const loanDetails = await this.loanRepo.findById(id);
    if (!loanDetails) {
      throw new AppError("Loan not found", 404);
    }

    if (role !== "admin" && loanDetails.loan.userId !== userId) {
      throw new AppError("Unauthorized access to loan details", 403);
    }

    return loanDetails;
  }

  async updateLoanStatusByAdmin(adminId: string, loanId: string, status: typeof loans.$inferSelect.status, remarks?: string) {
    const loanDetails = await this.loanRepo.findById(loanId);
    if (!loanDetails) {
      throw new AppError("Loan application not found", 404);
    }

    const previousStatus = loanDetails.loan.status;
    const updatedLoan = await this.loanRepo.update(loanId, {
      status,
      adminRemarks: remarks || loanDetails.loan.adminRemarks,
    });

    let action = "loan_status_update";
    if (status === "approved") action = "loan_approval";
    else if (status === "rejected") action = "loan_rejection";

    await this.auditRepo.create({
      userId: adminId,
      action,
      details: { loanId, previousStatus, newStatus: status, remarks },
    });

    let title = "Loan Status Update";
    let message = `Your loan status has been updated to: ${status}`;
    let notifType: "loan_approved" | "loan_rejected" | "document_required" | "admin_message" = "admin_message";

    if (status === "approved") {
      title = "Loan Approved 🎉";
      message = `Congratulations! Your loan application for ₹${updatedLoan.loanAmount} has been approved.`;
      notifType = "loan_approved";
    } else if (status === "rejected") {
      title = "Loan Application Rejected";
      message = `We regret to inform you that your loan application has been rejected. Remarks: ${remarks || "None"}`;
      notifType = "loan_rejected";
    } else if (status === "documents_required") {
      title = "KYC Documents Required";
      message = `Additional documents are required to process your loan application. Remarks: ${remarks || "Please upload updated files."}`;
      notifType = "document_required";
    } else if (status === "disbursed") {
      title = "Loan Disbursed 💰";
      message = `Your approved loan amount of ₹${updatedLoan.loanAmount} has been disbursed to your bank account.`;
      notifType = "admin_message";
    }

    await this.notificationService.notify(updatedLoan.userId, title, message, notifType);

    return updatedLoan;
  }

  async getAdminLoans(options: {
    limit: number;
    offset: number;
    search?: string;
    status?: typeof loans.$inferSelect.status;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) {
    const total = await this.loanRepo.count({ search: options.search, status: options.status });
    const data = await this.loanRepo.findAll(options);
    return {
      data,
      meta: {
        total,
        limit: options.limit,
        offset: options.offset,
      },
    };
  }
}
