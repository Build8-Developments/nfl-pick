import { Router } from "express";
import { triggerSyncNow, triggerSeasonSync } from "./sync.controller.js";

const syncRouter = Router();

syncRouter.post("/run-now/:season/:week", triggerSyncNow);
syncRouter.post("/run-season/:season", triggerSeasonSync);

export default syncRouter;
