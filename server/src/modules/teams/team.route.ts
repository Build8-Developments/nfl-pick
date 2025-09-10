import { Router } from "express";
import { getAllTeams } from "./team.controller.js";

const teamRouter = Router();

teamRouter.get("/", getAllTeams);

export default teamRouter;
