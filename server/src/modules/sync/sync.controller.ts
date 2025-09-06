import type { Request, Response } from "express";
import {
  syncWeekGames,
  syncSeasonGames,
  syncAllPlayers,
  syncBettingOddsForGame,
  syncBettingOddsForAllGames,
} from "./sync.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { insertPlayers } from "../players/players.service.js";
import { syncTeams } from "../teams/team.service.js";

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

    return res.json(ApiResponse.success(result, "Players synced successfully"));
  } catch (error) {
    res.status(500).json({ message: "Players sync failed" });
  }
};

export const triggerSyncBettingOdds = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params as { gameId: string };

    const result = await syncBettingOddsForGame(gameId);

    if (!result) {
      return res
        .status(404)
        .json(ApiResponse.error("No betting odds found for game"));
    }

    return res.json(
      ApiResponse.success(result, "Betting odds synced successfully")
    );
  } catch (error) {
    return res.status(500).json(ApiResponse.error("Betting odds sync failed"));
  }
};

export const triggerSyncBettingOddsForAllGames = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await syncBettingOddsForAllGames();
    return res.json(
      ApiResponse.success(result, "Betting odds synced successfully")
    );
  } catch (error) {
    return res.status(500).json(ApiResponse.error("Betting odds sync failed"));
  }
};

export const triggerSyncTeams = async (req: Request, res: Response) => {
  try {
    const result = await syncTeams();
    return res.json(ApiResponse.success(result, "Teams synced successfully"));
  } catch (error) {
    return res.status(500).json(ApiResponse.error("Teams sync failed"));
  }
};
