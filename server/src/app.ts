import express, { type Request, type Response } from "express";
import { protect, protectAdmin } from "./middlewares/auth.middleware.js";
import userRouter from "./modules/users/user.route.js";

import { ApiResponse } from "./utils/ApiResponse.js";
import authRouter from "./modules/auth/auth.route.js";
import syncRouter from "./modules/sync/sync.route.js";
import gamesRouter from "./modules/games/games.route.js";
import playersRouter from "./modules/players/players.route.js";
import bettingOddsRouter from "./modules/betting-odds/bettingOdds.routes.js";
import liveRouter from "./modules/live/live.route.js";
import teamRouter from "./modules/teams/team.route.js";
import pickRouter from "./modules/picks/pick.route.js";
import leaderboardRouter from "./modules/leaderboard/leaderboard.route.js";
import adminRouter from "./modules/admin/admin.route.js";
import dashboardRouter from "./modules/dashboard/dashboard.route.js";
import uploadRouter from "./modules/uploads/upload.route.js";
import liveScoringRouter from "./modules/live-scoring/liveScoring.route.js";
import notificationRouter from "./modules/notifications/notification.route.js";

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

// Public CORS test endpoint
app.get("/cors-test", (req: Request, res: Response) => {
  res.status(200).json({
    message: "CORS is working!",
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/users", userRouter);
app.use("/auth", authRouter);

// Uploads
app.use("/uploads", uploadRouter);

// Sync
app.use("/sync", syncRouter);

// Games
app.use("/games", gamesRouter);

// Players
app.use("/players", playersRouter);

// Betting Odds
app.use("/betting-odds", bettingOddsRouter);

// Teams
app.use("/teams", teamRouter);

// Picks
app.use("/picks", pickRouter);

// Live SSE
app.use("/live-picks", liveRouter);

// Leaderboard
app.use("/leaderboard", leaderboardRouter);

// Admin
app.use("/admin", adminRouter);

// Dashboard summary
app.use("/dashboard", dashboardRouter);

// Live scoring
app.use("/live-scoring", liveScoringRouter);

// Notifications
app.use("/notifications", notificationRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json(ApiResponse.error(`Route ${req.originalUrl} not found`));
});

export default app;
