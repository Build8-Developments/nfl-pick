import { Router } from "express";
import {
  triggerSyncNow,
  triggerSeasonSync,
  triggerSyncAllPlayers,
  triggerSyncBettingOdds,
  triggerSyncBettingOddsForAllGames,
  triggerSyncTeams,
} from "./sync.controller.js";

const syncRouter = Router();

syncRouter.post("/run-now/:season/:week", triggerSyncNow);
syncRouter.post("/run-season/:season", triggerSeasonSync);
syncRouter.post("/run-all-players", triggerSyncAllPlayers);
syncRouter.post("/run-betting-odds/:gameId", triggerSyncBettingOdds);
syncRouter.post(
  "/run-betting-odds-all-games",
  triggerSyncBettingOddsForAllGames
);
syncRouter.post("/run-teams", triggerSyncTeams);

export default syncRouter;
