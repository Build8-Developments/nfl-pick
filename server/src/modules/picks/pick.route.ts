import { Router } from "express";
import { protect, protectAdmin } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/errorHandler.middleware.js";
import {
  getMyPickByWeek,
  upsertMyPick,
  deleteMyPick,
  getAllPicksByWeek,
  getPickByQuery,
  getWeeksWithFinalizedPicks,
  getAllPropBets,
  updatePropBetStatus,
  debugAllPicks,
  createTestPropBet,
  debugPropBetStatus,
  getUsedTdScorers,
} from "./pick.controller.js";
import { rateLimit } from "../../middlewares/rateLimit.middleware.js";

const pickRouter = Router();

pickRouter.use(protect);

// IMPORTANT: Register specific routes before generic parameter routes
pickRouter.get("/all/:week", asyncHandler(getAllPicksByWeek));
pickRouter.get("/weeks", asyncHandler(getWeeksWithFinalizedPicks));
pickRouter.get("/used-td-scorers", asyncHandler(getUsedTdScorers));

// Query by ?week=3&userId=... (userId optional, defaults to authenticated user)
pickRouter.get("/", asyncHandler(getPickByQuery));
pickRouter.get("/:week", asyncHandler(getMyPickByWeek));

// Limit autosave burst and manual submits
pickRouter.post(
  "/",
  (req, res, next) => {
    console.log("[PICKS ROUTE] POST /picks received - ROUTE HIT");
    console.log(
      "[PICKS ROUTE] Request body:",
      JSON.stringify(req.body, null, 2)
    );
    next();
  },
  rateLimit({ windowMs: 10_000, max: 8 }),
  asyncHandler(upsertMyPick)
);
pickRouter.delete("/:week", asyncHandler(deleteMyPick));

// Prop bet management routes (admin only)
pickRouter.get("/prop-bets", protectAdmin, asyncHandler(getAllPropBets));
pickRouter.patch("/prop-bets/:propBetId", protectAdmin, asyncHandler(updatePropBetStatus));

// Debug route (admin only)
pickRouter.get("/debug", protectAdmin, asyncHandler(debugAllPicks));

// Test route (admin only)
pickRouter.post("/test-prop-bet", protectAdmin, asyncHandler(createTestPropBet));

// Debug route (admin only)
pickRouter.get("/debug-prop-bet-status", protectAdmin, asyncHandler(debugPropBetStatus));

export default pickRouter;
