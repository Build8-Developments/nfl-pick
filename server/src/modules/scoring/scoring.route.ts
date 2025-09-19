import { Router } from "express";
import {
  calculateWeeklyPoints,
  getUserWeekScoring,
  getUserSeasonPoints,
  getWeeklySummary,
} from "./scoring.controller.js";
import { protect, protectAdmin } from "../../middlewares/auth.middleware.js";

const scoringRouter = Router();

// Admin routes (protected)
scoringRouter.post(
  "/calculate-weekly/:week/:season",
  protectAdmin,
  calculateWeeklyPoints
);

// User routes (protected)
scoringRouter.get(
  "/user/:userId/week/:week/:season",
  protect,
  getUserWeekScoring
);
scoringRouter.get("/user/:userId/season/:season", protect, getUserSeasonPoints);

// Public routes (for viewing weekly summaries)
scoringRouter.get("/weekly-summary/:week/:season", getWeeklySummary);

export default scoringRouter;
