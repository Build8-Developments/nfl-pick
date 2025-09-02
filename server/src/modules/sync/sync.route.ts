import { Router } from "express";
import {
  triggerSyncNow,
  triggerSeasonSync,
  triggerSyncAllPlayers,
} from "./sync.controller.js";

const syncRouter = Router();

syncRouter.post("/run-now/:season/:week", triggerSyncNow);
syncRouter.post("/run-season/:season", triggerSeasonSync);
syncRouter.post("/run-all-players", triggerSyncAllPlayers);

export default syncRouter;
