import { z } from "zod";

export const recordRepaymentSchema = {
  body: z.object({
    loanId: z.string().uuid({ message: "Invalid loan ID format" }),
    amount: z.number().positive({ message: "Repayment amount must be positive" }),
    paymentDate: z.string().transform((str) => new Date(str)).optional(),
    paymentMethod: z.enum(["upi", "bank_transfer", "cash", "other"]),
    transactionRef: z.string().min(5, { message: "Transaction reference is required (min 5 chars)" }),
    remarks: z.string().optional(),
    screenshotUrl: z.string().min(1, { message: "Payment screenshot is required" }),
  }),
};
