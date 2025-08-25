import express, { type Request, type Response } from "express";
import { protect, protectAdmin } from "./middlewares/auth.middleware.js";
import userRouter from "./modules/users/user.route.js";
import { ApiResponse } from "./utils/apiResponse.js";
import authRouter from "./modules/auth/auth.route.js";

const app = express.Router();

app.get("/health", protectAdmin, (req: Request, res: Response) => {
  res.status(200).json({
    message: "OK",
    timestamp: new Date().toISOString(),
    uptime: `${process.uptime()} seconds`,
    memory: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
    nodeVersion: process.version,
  });
});

// Routes
app.use("/users", userRouter);
app.use("/auth", authRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json(ApiResponse.error(`Route ${req.originalUrl} not found`));
});

export default app;
