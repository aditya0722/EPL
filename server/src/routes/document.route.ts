import express from "express";
import { uploadDoc, getUserDocs } from "../controllers/document.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = express.Router();

router.post("/upload", authenticate, upload.single("file"), asyncHandler(uploadDoc));
router.get("/", authenticate, asyncHandler(getUserDocs));

export default router;
