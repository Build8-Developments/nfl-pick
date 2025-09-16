import { Router, type Request, type Response } from "express";
import { getGameboxscore } from "./boxscore.controller.js";

const boxscoreRouter = Router();

boxscoreRouter.get("/:gameId", getGameboxscore);

export default boxscoreRouter;
