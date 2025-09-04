import { Router } from "express";
import { getDashboard } from "./dashboard.controller.js";

const dashboardRouter = Router();

dashboardRouter.get("/", getDashboard);

export default dashboardRouter;


