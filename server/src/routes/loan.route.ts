import express from "express";
import { applyLoan, getLoanDetails, getLoanHistory } from "../controllers/loan.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";
import { applyLoanSchema, getLoanDetailsSchema } from "../validators/loan.validator.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = express.Router();

router.post("/apply", authenticate, validateRequest(applyLoanSchema), asyncHandler(applyLoan));
router.get("/history", authenticate, asyncHandler(getLoanHistory));
router.get("/:id", authenticate, validateRequest(getLoanDetailsSchema), asyncHandler(getLoanDetails));

export default router;
