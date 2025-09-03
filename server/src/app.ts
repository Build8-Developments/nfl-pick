import express, { type Request, type Response } from "express";
import { protect, protectAdmin } from "./middlewares/auth.middleware.js";
import userRouter from "./modules/users/user.route.js";

import { ApiResponse } from "./utils/ApiResponse.js";
import authRouter from "./modules/auth/auth.route.js";
import syncRouter from "./modules/sync/sync.route.js";
import gamesRouter from "./modules/games/games.route.js";
import playersRouter from "./modules/players/players.route.js";
import bettingOddsRouter from "./modules/betting-odds/bettingOdds.routes.js";
import teamRouter from "./modules/teams/team.route.js";
import pickRouter from "./modules/picks/pick.route.js";

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

app.use((req: Request, res: Response) => {
  res.status(404).json(ApiResponse.error(`Route ${req.originalUrl} not found`));
});

export default app;
