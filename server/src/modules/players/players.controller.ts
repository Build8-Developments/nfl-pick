import type { Request, Response } from "express";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { getAllPlayersService } from "./players.service.js";

export const getAllPlayers = async (req: Request, res: Response) => {
  const page = Number.parseInt((req.query.page as string) ?? "1", 10);
  const limit = Number.parseInt((req.query.limit as string) ?? "20", 10);
  const search = (req.query.search as string) ?? undefined;

  const result = await getAllPlayersService({ page, limit, search });
  res
    .status(200)
    .json(ApiResponse.success(result, "Players fetched successfully"));
};
