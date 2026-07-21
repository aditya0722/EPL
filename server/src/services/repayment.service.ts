import { RepaymentRepository } from "../repositories/repayment.repository.js";
import { LoanRepository } from "../repositories/loan.repository.js";
import { AuditRepository } from "../repositories/audit.repository.js";
import { NotificationService } from "./notification.service.js";
import { AppError } from "../utils/app-error.js";

export class RepaymentService {
  private repaymentRepo: RepaymentRepository;
  private loanRepo: LoanRepository;
  private auditRepo: AuditRepository;
  private notificationService: NotificationService;

  constructor() {
    this.repaymentRepo = new RepaymentRepository();
    this.loanRepo = new LoanRepository();
    this.auditRepo = new AuditRepository();
    this.notificationService = new NotificationService();
  }

  async recordRepayment(adminOrUserId: string, data: {
    loanId: string;
    amount: number;
    paymentDate: Date;
    paymentMethod: "upi" | "bank_transfer" | "cash" | "other";
    transactionRef: string;
    remarks?: string;
    screenshotUrl?: string;
    status?: "pending" | "completed" | "failed";
  }) {
    const loanDetails = await this.loanRepo.findById(data.loanId);
    if (!loanDetails) {
      throw new AppError("Loan not found", 404);
    }

    if (loanDetails.loan.status !== "disbursed" && loanDetails.loan.status !== "defaulted") {
      throw new AppError("Payments can only be recorded for disbursed or defaulted loans", 400);
    }

    const initialStatus = data.status || "pending";

    const repayment = await this.repaymentRepo.create({
      loanId: data.loanId,
      amount: data.amount.toString(),
      paymentDate: data.paymentDate,
      paymentMethod: data.paymentMethod,
      transactionRef: data.transactionRef,
      remarks: data.remarks,
      screenshotUrl: data.screenshotUrl,
      status: initialStatus,
    });

    await this.auditRepo.create({
      userId: adminOrUserId,
      action: initialStatus === "completed" ? "payment_update" : "payment_submission",
      details: { loanId: data.loanId, repaymentId: repayment.id, amount: data.amount, status: initialStatus },
    });

    if (initialStatus === "completed") {
      const totalRepaid = await this.repaymentRepo.getSumByLoanId(data.loanId);
      const totalPayable = Number(loanDetails.loan.totalPayable);

      let loanStatusUpdated = false;
      if (totalRepaid >= totalPayable) {
        await this.loanRepo.update(data.loanId, { status: "closed" });
        loanStatusUpdated = true;
      }

      await this.notificationService.notify(
        loanDetails.loan.userId,
        "Repayment Recorded 💸",
        `A repayment of ₹${data.amount} has been successfully recorded for your loan.${
          loanStatusUpdated ? " Your loan is now closed." : ""
        }`,
        "payment_recorded"
      );

      return {
        repayment,
        outstandingAmount: Math.max(0, totalPayable - totalRepaid),
        status: loanStatusUpdated ? "closed" : loanDetails.loan.status,
      };
    }

    await this.notificationService.notify(
      loanDetails.loan.userId,
      "Repayment Submitted ⌛",
      `Your payment request of ₹${data.amount} is waiting for admin verification.`,
      "admin_message"
    );

    await this.notificationService.notifyAdmins(
      "Payment Awaiting Verification 💳",
      `${loanDetails.user.fullName || loanDetails.user.email} submitted a repayment of ₹${data.amount} with receipt for review.`,
      "payment_recorded",
      { repaymentId: repayment.id, loanId: data.loanId }
    );

    const totalRepaid = await this.repaymentRepo.getSumByLoanId(data.loanId);
    const totalPayable = Number(loanDetails.loan.totalPayable);

    return {
      repayment,
      outstandingAmount: Math.max(0, totalPayable - totalRepaid),
      status: loanDetails.loan.status,
    };
  }

  async verifyRepayment(adminId: string, repaymentId: string, status: "completed" | "failed", adminRemarks?: string) {
    const repayment = await this.repaymentRepo.findById(repaymentId);
    if (!repayment) {
      throw new AppError("Repayment record not found", 404);
    }

    if (repayment.status !== "pending") {
      throw new AppError(`Repayment has already been verified with status: ${repayment.status}`, 400);
    }

    const updatedRepayment = await this.repaymentRepo.update(repaymentId, {
      status,
      remarks: adminRemarks || repayment.remarks,
    });

    await this.auditRepo.create({
      userId: adminId,
      action: "payment_verification",
      details: { repaymentId, status, remarks: adminRemarks },
    });

    const loanDetails = await this.loanRepo.findById(repayment.loanId);
    if (!loanDetails) {
      throw new AppError("Associated loan not found", 404);
    }

    let outstandingAmount = Number(loanDetails.loan.totalPayable);
    let loanStatusUpdated = false;

    if (status === "completed") {
      const totalRepaid = await this.repaymentRepo.getSumByLoanId(repayment.loanId);
      const totalPayable = Number(loanDetails.loan.totalPayable);
      outstandingAmount = Math.max(0, totalPayable - totalRepaid);

      if (totalRepaid >= totalPayable) {
        await this.loanRepo.update(repayment.loanId, { status: "closed" });
        loanStatusUpdated = true;
      }
    } else {
      const totalRepaid = await this.repaymentRepo.getSumByLoanId(repayment.loanId);
      const totalPayable = Number(loanDetails.loan.totalPayable);
      outstandingAmount = Math.max(0, totalPayable - totalRepaid);
    }

    await this.notificationService.notify(
      loanDetails.loan.userId,
      status === "completed" ? "Repayment Verified ✅" : "Repayment Rejected ❌",
      status === "completed"
        ? `Your repayment of ₹${repayment.amount} has been approved.${
            loanStatusUpdated ? " Your loan is now closed." : ""
          }`
        : `Your repayment of ₹${repayment.amount} was rejected. Remarks: ${adminRemarks || "None"}`,
      "payment_recorded"
    );

    return {
      repayment: updatedRepayment,
      outstandingAmount,
      status: loanStatusUpdated ? "closed" : loanDetails.loan.status,
    };
  }

  async getRepaymentHistory(loanId: string, userId: string, role: string) {
    const loanDetails = await this.loanRepo.findById(loanId);
    if (!loanDetails) {
      throw new AppError("Loan not found", 404);
    }

    if (role !== "admin" && loanDetails.loan.userId !== userId) {
      throw new AppError("Unauthorized access to repayment history", 403);
    }

    const history = await this.repaymentRepo.findByLoanId(loanId);
    const totalRepaid = await this.repaymentRepo.getSumByLoanId(loanId);
    const totalPayable = Number(loanDetails.loan.totalPayable);
    const outstanding = Math.max(0, totalPayable - totalRepaid);

    return {
      repayments: history,
      totalRepaid,
      outstandingAmount: outstanding,
      loanAmount: totalPayable,
    };
  }

  async getPendingRepayments() {
    const pending = await this.repaymentRepo.findPending();
    const result = [];
    for (const r of pending) {
      const loanDetails = await this.loanRepo.findById(r.loanId);
      if (loanDetails) {
        result.push({
          repayment: r,
          loan: loanDetails.loan,
          user: loanDetails.user,
        });
      }
    }
    return result;
  }

  async getAllRepayments() {
    const all = await this.repaymentRepo.findAll();
    const result = [];
    for (const r of all) {
      const loanDetails = await this.loanRepo.findById(r.loanId);
      if (loanDetails) {
        result.push({
          repayment: r,
          loan: loanDetails.loan,
          user: loanDetails.user,
        });
      }
    }
    return result;
  }
}
