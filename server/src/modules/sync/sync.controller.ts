import type { Request, Response } from "express";
import { syncWeekGames, syncSeasonGames } from "./sync.service.js";

export const triggerSyncNow = async (req: Request, res: Response) => {
  try {
    const { week, season } = req.params as { week?: string; season?: string };
    const result = await syncWeekGames(
      week ? Number(week) : undefined,
      season ? Number(season) : undefined
    );
    res.json({ message: "Sync completed", ...result });
  } catch (error) {
    res.status(500).json({ message: "Sync failed" });
  }
};

export const triggerSeasonSync = async (req: Request, res: Response) => {
  try {
    const { season } = req.query as { season?: string };
    const result = await syncSeasonGames(season ? Number(season) : undefined);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Season sync failed" });
  }
};
