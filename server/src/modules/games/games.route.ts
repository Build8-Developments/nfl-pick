import { Router } from "express";
import { getGameById, getGames } from "./games.controller.js";

const gamesRouter = Router();

gamesRouter.get("/", getGames);
gamesRouter.get("/:id", getGameById);

export default gamesRouter;
