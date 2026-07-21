import express from "express";
import { getProfile, updateProfile, getDashboard, updatePushToken } from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";
import { updateProfileSchema } from "../validators/user.validator.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = express.Router();

router.get("/profile", authenticate, asyncHandler(getProfile));
router.put("/profile", authenticate, validateRequest(updateProfileSchema), asyncHandler(updateProfile));
router.get("/dashboard", authenticate, asyncHandler(getDashboard));
router.post("/push-token", authenticate, asyncHandler(updatePushToken));

export default router;
