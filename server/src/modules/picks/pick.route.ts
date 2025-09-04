import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/errorHandler.middleware.js";
import {
  getMyPickByWeek,
  upsertMyPick,
  deleteMyPick,
  getAllPicksByWeek,
  getPickByQuery,
  getWeeksWithFinalizedPicks,
} from "./pick.controller.js";
import { rateLimit } from "../../middlewares/rateLimit.middleware.js";

const pickRouter = Router();

pickRouter.use(protect);

// IMPORTANT: Register specific routes before generic parameter routes
pickRouter.get("/all/:week", asyncHandler(getAllPicksByWeek));
pickRouter.get("/weeks", asyncHandler(getWeeksWithFinalizedPicks));

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

export default pickRouter;
