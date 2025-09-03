import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/errorHandler.middleware.js";
import { getMyPickByWeek, upsertMyPick, deleteMyPick } from "./pick.controller.js";

const pickRouter = Router();

pickRouter.use(protect);

pickRouter.get("/:week", asyncHandler(getMyPickByWeek));
pickRouter.post("/", asyncHandler(upsertMyPick));
pickRouter.delete("/:week", asyncHandler(deleteMyPick));

export default pickRouter;


