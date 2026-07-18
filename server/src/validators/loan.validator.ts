import { z } from "zod";

export const applyLoanSchema = {
  body: z.object({
    loanAmount: z.number().min(5000, { message: "Minimum loan amount is ₹5,000" }).max(10000, { message: "Maximum loan amount is ₹10,000" }),
    loanPurpose: z.string().min(5, { message: "Loan purpose must be at least 5 characters" }),
    employmentType: z.string().min(2, { message: "Employment type is required" }),
    monthlyIncome: z.number().positive({ message: "Monthly income must be positive" }),
    existingEmi: z.number().nonnegative({ message: "Existing EMI must be non-negative" }).optional(),
    loanDuration: z.number().int().positive({ message: "Duration must be a positive integer in months" }),
    repaymentType: z.enum(["emi", "full_payment"]),
  }),
};

export const updateLoanStatusSchema = {
  body: z.object({
    status: z.enum([
      "pending",
      "under_review",
      "documents_required",
      "approved",
      "rejected",
      "disbursed",
      "closed",
      "defaulted",
      "cancelled",
    ]),
    remarks: z.string().optional(),
  }),
  params: z.object({
    id: z.string().uuid({ message: "Invalid loan ID format" }),
  }),
};

export const getLoanDetailsSchema = {
  params: z.object({
    id: z.string().uuid({ message: "Invalid loan ID format" }),
  }),
};

export const getAdminLoansSchema = {
  query: z.object({
    limit: z.string().default("10").transform((v) => parseInt(v, 10)),
    offset: z.string().default("0").transform((v) => parseInt(v, 10)),
    search: z.string().optional(),
    status: z.enum([
      "pending",
      "under_review",
      "documents_required",
      "approved",
      "rejected",
      "disbursed",
      "closed",
      "defaulted",
      "cancelled",
    ]).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
};
