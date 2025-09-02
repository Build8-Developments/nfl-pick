import type { Request, Response } from "express";
import { getLocalBettingOddsForGame } from "./bettingOdds.service.js";

export const getNFLBettingOddsForGame = async (req: Request, res: Response) => {
  const { gameId } = req.params as { gameId: string };
  const result = await getLocalBettingOddsForGame(gameId);
  res.json(result);
};
