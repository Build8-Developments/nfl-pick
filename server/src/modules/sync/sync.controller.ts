import type { Request, Response } from "express";
import {
  syncWeekGames,
  syncSeasonGames,
  syncAllPlayers,
} from "./sync.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { insertPlayers } from "../players/players.service.js";

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

export const triggerSyncAllPlayers = async (req: Request, res: Response) => {
  try {
    const result = await syncAllPlayers();

    if (!result) {
      return res.status(404).json(ApiResponse.error("No players found"));
    }

    // save players to database
    const players = result.body;

    const newPlayers = await insertPlayers(players);

    console.log(typeof newPlayers);
  } catch (error) {
    res.status(500).json({ message: "Players sync failed" });
  }
};
