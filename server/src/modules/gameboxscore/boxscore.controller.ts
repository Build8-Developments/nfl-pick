import { type Request, type Response } from "express";
import { getGameboxscoreService } from "./boxscore.service.js";

export const getGameboxscore = async (req: Request, res: Response) => {
  const { gameId } = req.params;

  if (!gameId) {
    return res.status(400).json({ error: "gameId parameter is required" });
  }

  const gameBoxscore = await getGameboxscoreService(gameId);

  if (!gameBoxscore) {
    return res.status(404).json({ error: "Boxscore not found" });
  }

  return res.status(200).json(gameBoxscore);
};
