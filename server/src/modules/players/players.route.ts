import { Router } from "express";
import { getAllPlayers, getPlayerById } from "./players.controller.js";

const playersRouter = Router();

playersRouter.get("/", getAllPlayers);
playersRouter.get("/:id", getPlayerById);

export default playersRouter;
