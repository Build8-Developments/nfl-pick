import type { Request, Response } from "express";
import { getLocalBettingOddsForGame } from "./bettingOdds.service.js";

export const getNFLBettingOddsForGame = async (req: Request, res: Response) => {
  const { gameId } = req.params as { gameId: string };
  try {
    const result = await getLocalBettingOddsForGame(gameId);
    if (result) {
      res.json({
        success: true,
        data: result,
      });
    } else {
      res.json({
        success: false,
        message: "No betting odds found for this game",
      });
    }
  } catch (error) {
    console.error("Error fetching betting odds:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch betting odds",
    });
  }
};
