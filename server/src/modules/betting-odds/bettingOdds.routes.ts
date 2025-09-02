import { Router } from "express";
import { getNFLBettingOddsForGame } from "./bettingOdds.controller.js";

const bettingOddsRouter = Router();

bettingOddsRouter.get("/:gameId", getNFLBettingOddsForGame);

export default bettingOddsRouter;
