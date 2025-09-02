import type { Request, Response } from "express";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { getAllTeamsService } from "./team.service.js";

export const getAllTeams = async (req: Request, res: Response) => {
  const teams = await getAllTeamsService();
  res.status(200).json(ApiResponse.success(teams));
};
