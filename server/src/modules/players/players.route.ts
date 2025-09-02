import { Router } from "express";
import { getAllPlayers } from "./players.controller.js";

const playersRouter = Router();

playersRouter.get("/", getAllPlayers);

export default playersRouter;
