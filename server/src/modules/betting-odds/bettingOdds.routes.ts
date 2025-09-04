import { Router } from "express";
import { getNFLBettingOddsForGame } from "./bettingOdds.controller.js";
import { getNFLBettingOddsBatch } from "./bettingOddsBatch.controller.js";

const bettingOddsRouter = Router();

bettingOddsRouter.get("/:gameId", getNFLBettingOddsForGame);
bettingOddsRouter.post("/batch", getNFLBettingOddsBatch);

export default bettingOddsRouter;
