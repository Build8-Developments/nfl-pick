import type { Request, Response } from "express";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { getAllPlayersService } from "./players.service.js";
import Player from "./players.model.js";

export const getAllPlayers = async (req: Request, res: Response) => {
  const page = Number.parseInt((req.query.page as string) ?? "1", 10);
  const limit = Number.parseInt((req.query.limit as string) ?? "20", 10);
  const search = (req.query.search as string) ?? undefined;

  const result = await getAllPlayersService({ page, limit, search });
  res
    .status(200)
    .json(ApiResponse.success(result, "Players fetched successfully"));
};

export const getPlayerById = async (req: Request, res: Response) => {
  const playerId = req.params.id;

  try {
    const player = await Player.findOne({ playerID: playerId });
    if (!player) {
      return res.status(404).json(ApiResponse.error("Player not found"));
    }

    res
      .status(200)
      .json(ApiResponse.success(player, "Player fetched successfully"));
  } catch (error) {
    console.error("Error fetching player:", error);
    res.status(500).json(ApiResponse.error("Error fetching player"));
  }
};
