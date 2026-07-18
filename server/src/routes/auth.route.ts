import express from "express";
import { register, login, logout, refresh, changePassword, forgotPassword, resetPassword } from "../controllers/auth.controller.js";
import { validateRequest } from "../middlewares/validation.middleware.js";
import { registerSchema, loginSchema, refreshSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from "../validators/auth.validator.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = express.Router();

router.post("/register", validateRequest(registerSchema), asyncHandler(register));
router.post("/login", validateRequest(loginSchema), asyncHandler(login));
router.post("/logout", authenticate, asyncHandler(logout));
router.post("/refresh-token", validateRequest(refreshSchema), asyncHandler(refresh));
router.post("/change-password", authenticate, validateRequest(changePasswordSchema), asyncHandler(changePassword));
router.post("/forgot-password", validateRequest(forgotPasswordSchema), asyncHandler(forgotPassword));
router.post("/reset-password", validateRequest(resetPasswordSchema), asyncHandler(resetPassword));

export default router;
