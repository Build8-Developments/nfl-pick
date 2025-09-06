import type { Request, Response } from "express";
import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  getAllGames,
  getGameById as getGameByIdService,
} from "./games.service.js";

export const getGames = async (req: Request, res: Response) => {
  const games = await getAllGames();

  if (!games) {
    return res.status(404).json(ApiResponse.error("No games found"));
  }

  return res.status(200).json(ApiResponse.success(games));
};

export const getGameById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const game = await getGameByIdService(id as string);

  if (!game) {
    return res.status(404).json(ApiResponse.error("Game not found"));
  }

  return res.status(200).json(ApiResponse.success(game));
};
