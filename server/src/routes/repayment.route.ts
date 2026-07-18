import { Router } from "express";
import { getRepaymentHistory, makeRepayment } from "../controllers/repayment.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";
import { recordRepaymentSchema } from "../validators/repayment.validator.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.get("/:loanId", authenticate, asyncHandler(getRepaymentHistory));
router.post("/", authenticate, validateRequest(recordRepaymentSchema), asyncHandler(makeRepayment));

export default router;
