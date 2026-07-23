import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import swaggerUi from "swagger-ui-express";
import { errorHandler } from "./middlewares/error.middleware.js";
import authRouter from "./routes/auth.route.js";
import userRouter from "./routes/user.route.js";
import loanRouter from "./routes/loan.route.js";
import documentRouter from "./routes/document.route.js";
import repaymentRouter from "./routes/repayment.route.js";
import adminRouter from "./routes/admin.route.js";

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      return callback(null, true); // Allow all origins but echo them back
    },
    credentials: true,
  })
);

app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased from 100 to 1000 for local dev refresh loops
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use("/uploads", express.static(path.resolve("./uploads")));

const swaggerDocument = JSON.parse(
  fs.readFileSync(path.resolve("./src/config/swagger.json"), "utf8")
);
app.get(["/health", "/api/v1/health"], (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/loans", loanRouter);
app.use("/api/v1/documents", documentRouter);
app.use("/api/v1/repayments", repaymentRouter);
app.use("/api/v1/admin", adminRouter);

app.use(errorHandler);

export default app;
