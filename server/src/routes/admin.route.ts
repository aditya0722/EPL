import express from "express";
import { getDashboardStats, getLoans, updateLoanStatus, recordRepayment, verifyDocument, getUsers, getUserDocuments, verifyUserKyc, getPendingRepayments, verifyRepayment, getAllRepayments } from "../controllers/admin.controller.js";
import { authenticate, requireRole } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";
import { getAdminLoansSchema, updateLoanStatusSchema } from "../validators/loan.validator.js";
import { recordRepaymentSchema } from "../validators/repayment.validator.js";
import { verifyDocumentSchema } from "../validators/document.validator.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = express.Router();

router.use(authenticate, requireRole("admin"));

router.get("/dashboard/stats", asyncHandler(getDashboardStats));
router.get("/loans", validateRequest(getAdminLoansSchema), asyncHandler(getLoans));
router.patch("/loans/:id/status", validateRequest(updateLoanStatusSchema), asyncHandler(updateLoanStatus));
router.post("/payments", validateRequest(recordRepaymentSchema), asyncHandler(recordRepayment));
router.get("/payments", asyncHandler(getAllRepayments));
router.get("/payments/pending", asyncHandler(getPendingRepayments));
router.patch("/payments/:id/verify", asyncHandler(verifyRepayment));
router.patch("/documents/:id/verify", validateRequest(verifyDocumentSchema), asyncHandler(verifyDocument));
router.get("/users", asyncHandler(getUsers));
router.get("/users/:id/documents", asyncHandler(getUserDocuments));
router.patch("/users/:id/kyc", asyncHandler(verifyUserKyc));

export default router;
