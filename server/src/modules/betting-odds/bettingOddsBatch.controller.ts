import type { Request, Response } from "express";
import { getLocalBettingOddsForGame } from "./bettingOdds.service.js";

export const getNFLBettingOddsBatch = async (req: Request, res: Response) => {
  const ids = Array.isArray(req.body?.gameIds) ? (req.body.gameIds as string[]) : [];
  const unique = [...new Set(ids.filter((s) => typeof s === "string" && s.length > 0))];
  if (unique.length === 0) return res.json({ oddsByGameId: {} });

  const results = await Promise.all(
    unique.map(async (gameId) => {
      try {
        const odds = await getLocalBettingOddsForGame(gameId);
        return [gameId, odds] as const;
      } catch {
        return [gameId, undefined] as const;
      }
    })
  );

  const oddsByGameId: Record<string, any> = {};
  for (const [id, odds] of results) oddsByGameId[id] = odds;
  res.json({ oddsByGameId });
};


