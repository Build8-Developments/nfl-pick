import { Router } from "express";
import {
  fetchGameResult,
  processLiveScoring,
  getGameResult,
  getWeekResults,
  getActiveGames,
  getUserScoring,
  getLiveLeaderboard,
} from "./liveScoring.controller.js";
import {
  validateGameIDMiddleware,
  validateWeekSeasonMiddleware,
  validateUserIdMiddleware,
  rateLimitTank01Middleware,
  tank01ErrorHandler,
} from "./liveScoring.middleware.js";

const liveScoringRouter = Router();

// Apply error handling middleware
liveScoringRouter.use(tank01ErrorHandler);

// Fetch and save game result from Tank01 API
liveScoringRouter.post("/fetch/:gameID", 
  rateLimitTank01Middleware,
  validateGameIDMiddleware, 
  fetchGameResult
);

// Process live scoring for a game (fetch + evaluate picks)
liveScoringRouter.post("/process/:gameID", 
  rateLimitTank01Middleware,
  validateGameIDMiddleware, 
  processLiveScoring
);

// Get saved game result
liveScoringRouter.get("/game/:gameID", validateGameIDMiddleware, getGameResult);

// Get all game results for a week
liveScoringRouter.get("/week", validateWeekSeasonMiddleware, getWeekResults);

// Get active (non-final) games for a week
liveScoringRouter.get("/active", validateWeekSeasonMiddleware, getActiveGames);

// Get user's scoring for a specific week
liveScoringRouter.get("/user", validateUserIdMiddleware, validateWeekSeasonMiddleware, getUserScoring);

// Get live leaderboard for a week
liveScoringRouter.get("/leaderboard", validateWeekSeasonMiddleware, getLiveLeaderboard);

export default liveScoringRouter;
