import type { Request, Response } from "express";
import mongoose from "mongoose";
import { ApiResponse } from "../../utils/ApiResponse.js";
import Pick from "./pick.model.js";
import Game from "../games/games.model.js";
import { broadcastLiveEvent } from "../live/live.controller.js";

export const getMyPickByWeek = async (req: Request, res: Response) => {
  const userId = (req as any).user?._id as string;
  const week = Number(req.params.week);
  let pick = null;
  try {
    pick = await Pick.findOne({ user: userId, week });
    console.log("[PICKS] getMyPickByWeek", {
      userId,
      week,
      found: Boolean(pick),
    });

    // If pick exists and has a touchdown scorer, resolve player name
    if (pick && pick.touchdownScorer) {
      const Player = (await import("../players/players.model.js")).default;
      const player = await Player.findOne({ playerID: pick.touchdownScorer });
      if (player) {
        // Add player name to the response
        (pick as any).touchdownScorerName =
          player.longName || player.espnName || player.cbsLongName;
      }
    }
  } catch (err) {
    console.error("[PICKS] getMyPickByWeek error", { userId, week, err });
  }
  return res.status(200).json(ApiResponse.success(pick));
};

export const getPickByQuery = async (req: Request, res: Response) => {
  const authUserId = (req as any).user?._id as string | undefined;
  const requestedUserId =
    (req.query.userId as string | undefined) || authUserId;
  const weekNum = Number(req.query.week);

  if (!Number.isFinite(weekNum)) {
    return res
      .status(400)
      .json(ApiResponse.error("Invalid or missing 'week' query param"));
  }
  if (!requestedUserId) {
    return res
      .status(400)
      .json(ApiResponse.error("Missing 'userId' and no authenticated user"));
  }

  // Only allow a user to fetch their own pick unless extended with admin guard
  if (authUserId && requestedUserId !== String(authUserId)) {
    return res
      .status(403)
      .json(ApiResponse.error("Forbidden: cannot access other user's picks"));
  }

  const pick = await Pick.findOne({ user: requestedUserId, week: weekNum });
  return res.status(200).json(ApiResponse.success(pick));
};

export const upsertMyPick = async (req: Request, res: Response) => {
  console.log("[PICKS] upsertMyPick called - SERVER RECEIVED REQUEST");
  console.log("[PICKS] Request body:", JSON.stringify(req.body, null, 2));
  console.log("[PICKS] Request headers:", req.headers);
  const authUser = (req as any).user as
    | { _id: string; role?: string }
    | undefined;
  if (!authUser?._id) {
    console.log("[PICKS] Missing user context");
    return res.status(400).json(ApiResponse.error("Missing user context"));
  }

  // Resolve target user: non-admins are always themselves; admins may override
  const providedUserId =
    (req.query.userId as string | undefined) || (req.body as any)?.userId;
  const targetUserId =
    authUser.role === "admin"
      ? providedUserId || String(authUser._id)
      : String(authUser._id);
  const targetUserObjectId = new mongoose.Types.ObjectId(targetUserId);

  const {
    selections,
    lockOfWeek,
    touchdownScorer,
    propBet,
    propBetOdds,
    isFinalized,
  } = req.body as any;
  // Normalize selections keys to strings to match Game.gameID type
  const normalizedSelections: Record<string, string> = {};
  if (selections && typeof selections === "object") {
    for (const [gid, team] of Object.entries(selections)) {
      if (team == null) continue;
      normalizedSelections[String(gid)] = String(team);
    }
  }
  // Debug log
  try {
    console.log("[PICKS] upsert request", {
      userId: targetUserId,
      authUserId: authUser._id,
      role: authUser.role,
      week: (req.body as any)?.week ?? req.params.week,
      isFinalized: Boolean(isFinalized),
      selectionsCount: Object.keys(normalizedSelections).length,
    });
  } catch {}
  const weekNum = Number((req.body as any)?.week ?? req.params.week);
  if (!Number.isFinite(weekNum)) {
    return res.status(400).json(ApiResponse.error("Invalid week value"));
  }

  try {
    const existing = await Pick.findOne({
      user: targetUserObjectId,
      week: weekNum,
    });
    if (existing && existing.isFinalized) {
      console.warn("[PICKS] upsert denied: already finalized", {
        userId: targetUserId,
        week: weekNum,
      });
      return res
        .status(400)
        .json(
          ApiResponse.error("Picks already submitted and locked for this week")
        );
    }

    // Lock validation: if finalizing, ensure no selected game has passed kickoff
    if (isFinalized && selections && Object.keys(selections).length > 0) {
      const selectedGameIds = Object.keys(selections).filter(
        (k) => typeof k === "string" && k.length > 0
      );
      if (selectedGameIds.length > 0) {
        const games = await Game.find({
          gameID: { $in: selectedGameIds },
        }).lean();
        const now = new Date();
        const parseGameDateTime = (
          gameDate: string | undefined,
          gameTime: string | undefined
        ) => {
          if (!gameDate || !gameTime) return new Date(8640000000000000);
          const yyyy = Number(gameDate.slice(0, 4));
          const mm = Number(gameDate.slice(4, 6));
          const dd = Number(gameDate.slice(6, 8));
          const m = gameTime.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])/i);
          let hours = 12;
          let minutes = 0;
          if (m) {
            hours = Number(m[1]);
            minutes = m[2] ? Number(m[2]) : 0;
            const meridiem = (m?.[3] ?? "a").toLowerCase();
            if (meridiem === "p" && hours !== 12) hours += 12;
            if (meridiem === "a" && hours === 12) hours = 0;
          }
          return new Date(yyyy, mm - 1, dd, hours, minutes, 0, 0);
        };
        for (const g of games) {
          const kickoff = parseGameDateTime(
            (g as any).gameDate,
            (g as any).gameTime
          );
          if (now >= new Date(kickoff.getTime() + 15 * 60 * 1000)) {
            console.warn("[PICKS] upsert denied: game started", {
              userId: targetUserId,
              week: weekNum,
              gameId: (g as any).gameID,
            });
            return res
              .status(400)
              .json(
                ApiResponse.error(
                  "One or more selected games have started; cannot submit for those games."
                )
              );
          }
        }
      }
    }

    // Finalization validation: ensure full submission for all not-yet-started games this week
    if (isFinalized) {
      // Load all games for the requested week and determine which are still eligible (not started + 15m buffer)
      const weekGames = await Game.find({
        gameWeek: new RegExp(`\\b${weekNum}\\b`, "i"),
      }).lean();
      const now = new Date();
      const parseGameDateTime = (
        gameDate: string | undefined,
        gameTime: string | undefined
      ) => {
        if (!gameDate || !gameTime) return new Date(8640000000000000);
        const yyyy = Number(gameDate.slice(0, 4));
        const mm = Number(gameDate.slice(4, 6));
        const dd = Number(gameDate.slice(6, 8));
        const m = gameTime.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])/i);
        let hours = 12;
        let minutes = 0;
        if (m) {
          hours = Number(m[1]);
          minutes = m[2] ? Number(m[2]) : 0;
          const meridiem = (m?.[3] ?? "a").toLowerCase();
          if (meridiem === "p" && hours !== 12) hours += 12;
          if (meridiem === "a" && hours === 12) hours = 0;
        }
        return new Date(yyyy, mm - 1, dd, hours, minutes, 0, 0);
      };
      const eligibleGames = weekGames.filter((g: any) => {
        const kickoff = parseGameDateTime(g.gameDate, g.gameTime);
        return now < new Date(kickoff.getTime() + 15 * 60 * 1000);
      });
      const eligibleGameIds = new Set(eligibleGames.map((g: any) => g.gameID));
      const requiredCount = eligibleGames.length;
      const selectionEntries = Object.entries(selections || {});
      const selectionCount = selectionEntries.length;

      if (weekGames.length === 0) {
        console.warn("[PICKS] upsert: no games found for week", {
          week: weekNum,
        });
        return res
          .status(400)
          .json(ApiResponse.error("No games found for this week"));
      }
      if (selectionCount !== requiredCount) {
        const providedIds = new Set(selectionEntries.map(([gid]) => gid));
        const missingGameIds: string[] = [];
        for (const gid of eligibleGameIds) {
          if (!providedIds.has(gid)) missingGameIds.push(gid);
        }
        console.warn("[PICKS] upsert denied: missing selections", {
          requiredCount,
          providedCount: selectionCount,
          missingGameIds,
        });
        return res
          .status(400)
          .json(
            ApiResponse.error(
              `You must make a pick for all ${requiredCount} upcoming games`,
              { requiredCount, providedCount: selectionCount, missingGameIds }
            )
          );
      }
      // Ensure no selection targets an ineligible (already started) game
      const invalidIds: string[] = [];
      for (const [gid] of selectionEntries) {
        if (!eligibleGameIds.has(gid)) invalidIds.push(gid as string);
      }
      if (invalidIds.length) {
        console.warn(
          "[PICKS] upsert denied: invalid game ids (already started)",
          { invalidIds }
        );
        return res
          .status(400)
          .json(
            ApiResponse.error(
              "Selections include games that have already started",
              { invalidGameIds: invalidIds }
            )
          );
      }
      const missingFields: string[] = [];
      if (
        !lockOfWeek ||
        typeof lockOfWeek !== "string" ||
        lockOfWeek.trim().length === 0
      )
        missingFields.push("lockOfWeek");
      if (
        !touchdownScorer ||
        typeof touchdownScorer !== "string" ||
        touchdownScorer.trim().length === 0
      )
        missingFields.push("touchdownScorer");
      if (
        !propBet ||
        typeof propBet !== "string" ||
        propBet.trim().length === 0
      )
        missingFields.push("propBet");
      if (
        !propBetOdds ||
        typeof propBetOdds !== "string" ||
        propBetOdds.trim().length === 0
      )
        missingFields.push("propBetOdds");
      if (missingFields.length) {
        console.warn("[PICKS] upsert denied: missing fields", {
          missingFields,
        });
        return res
          .status(400)
          .json(
            ApiResponse.error("Missing required fields", { missingFields })
          );
      }

      // Optional: ensure lockOfWeek is among selected teams
      const selectedTeams = new Set(Object.values(selections || {}));
      if (!selectedTeams.has(lockOfWeek)) {
        console.warn("[PICKS] upsert denied: lock not in selections", {
          lockOfWeek,
        });
        return res
          .status(400)
          .json(
            ApiResponse.error(
              "Lock of the Week must be one of your selected teams",
              { lockOfWeek }
            )
          );
      }
    }
    // Safer upsert flow to avoid rare duplicate key conflicts
    const saved = await Pick.findOneAndUpdate(
      { user: targetUserObjectId, week: weekNum },
      {
        $set: {
          selections: normalizedSelections,
          lockOfWeek: lockOfWeek ?? undefined,
          touchdownScorer: touchdownScorer ?? undefined,
          propBet: propBet ?? undefined,
          propBetOdds: propBetOdds ?? undefined,
          isFinalized: Boolean(isFinalized) || (existing?.isFinalized ?? false),
        },
        $setOnInsert: { user: targetUserObjectId, week: weekNum },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    // If still null, try alternative approach
    let finalSaved: any = saved;
    if (!finalSaved) {
      console.log("[PICKS] findOneAndUpdate returned null, trying findOne", {
        targetUserId,
        week: weekNum,
      });
      finalSaved = await Pick.findOne({
        user: targetUserObjectId,
        week: weekNum,
      }).lean();
    }

    try {
      console.log("[PICKS] upsert saved (post-read)", {
        userId: targetUserId,
        week: weekNum,
        targetUserObjectId: targetUserObjectId.toString(),
        hasDoc: Boolean(finalSaved),
        isFinalized: finalSaved?.isFinalized,
        selectionsCount: finalSaved
          ? Object.keys(finalSaved.selections || {}).length
          : 0,
        savedDoc: finalSaved ? JSON.stringify(finalSaved, null, 2) : "null",
      });
    } catch {}
    if (finalSaved?.isFinalized) {
      broadcastLiveEvent({
        type: "pick:finalize",
        payload: { userId: targetUserId, week: weekNum },
      });
    } else {
      broadcastLiveEvent({
        type: "pick:update",
        payload: { userId: targetUserId, week: weekNum },
      });
    }
    console.log(
      "[PICKS] About to return response with data:",
      finalSaved ? "HAS DATA" : "NULL DATA"
    );
    console.log(
      "[PICKS] Final saved document:",
      JSON.stringify(finalSaved, null, 2)
    );
    return res.status(200).json(ApiResponse.success(finalSaved, "Picks saved"));
  } catch (err: any) {
    // If duplicate occurred due to race, retry without upsert as pure update
    if (err && err.code === 11000) {
      console.warn("[PICKS] upsert duplicate key, retrying as update", {
        userId: targetUserId,
        week: weekNum,
      });
      await Pick.findOneAndUpdate(
        { user: targetUserObjectId, week: weekNum },
        {
          $set: {
            selections: normalizedSelections,
            lockOfWeek: lockOfWeek ?? undefined,
            touchdownScorer: touchdownScorer ?? undefined,
            propBet: propBet ?? undefined,
            propBetOdds: propBetOdds ?? undefined,
            isFinalized: Boolean(isFinalized),
          },
        }
      );

      // Fetch the saved document to ensure we return actual data
      const savedRetry = await Pick.findOne({
        user: targetUserObjectId,
        week: weekNum,
      }).lean();
      return res
        .status(200)
        .json(ApiResponse.success(savedRetry, "Picks saved"));
    } else {
      console.error("[PICKS] upsert error", {
        userId: targetUserId,
        week: weekNum,
        err,
      });
      throw err;
    }
  }
  // Fallback (shouldn't generally reach here due to early returns)
  const updated = await Pick.findOne({
    user: targetUserObjectId,
    week: weekNum,
  }).lean();
  if (updated?.isFinalized) {
    broadcastLiveEvent({
      type: "pick:finalize",
      payload: { userId: targetUserId, week: weekNum },
    });
  } else {
    broadcastLiveEvent({
      type: "pick:update",
      payload: { userId: targetUserId, week: weekNum },
    });
  }
  return res.status(200).json(ApiResponse.success(updated, "Picks saved"));
};

export const deleteMyPick = async (req: Request, res: Response) => {
  const userId = (req as any).user?._id as string;
  const week = Number(req.params.week);
  const existing = await Pick.findOne({ user: userId, week });
  if (existing && existing.isFinalized) {
    return res
      .status(400)
      .json(ApiResponse.error("Cannot delete a submitted pick for this week"));
  }
  await Pick.findOneAndDelete({ user: userId, week });
  return res.status(200).json(ApiResponse.success(null, "Picks deleted"));
};

export const getAllPicksByWeek = async (req: Request, res: Response) => {
  const week = Number(req.params.week);
  // Show all submitted picks for the live feed to every authenticated user
  let picks: any[] = [];
  try {
    picks = await Pick.find({ week, isFinalized: true })
      .populate({ path: "user", select: "username avatar _id" })
      .sort({ updatedAt: -1 })
      .lean();
    console.log("[PICKS] getAllPicksByWeek", {
      week,
      count: picks?.length || 0,
    });
  } catch (err) {
    console.error("[PICKS] getAllPicksByWeek error", { week, err });
  }
  // Compute outcomes based on Game winner when available
  const games = await Game.find({
    gameWeek: new RegExp(`\\b${week}\\b`, "i"),
  }).lean();
  const gameIdToWinner = new Map<string, string>();
  for (const g of games) {
    // Assume if gameStatus indicates FINAL and away/home strings are team abv
    // Winner resolution: basic heuristic using possible score info if present in doc later
    // Here, fallback to none; outcomes will be filled by scoring worker
    // Placeholder map remains empty unless scoring worker saves a winner field later
    // If future schema has winnerAbv: set it here
    // (g as any).winnerAbv && gameIdToWinner.set((g as any).gameID, (g as any).winnerAbv);
  }

  const enriched = (picks || [])
    .filter((p: any) => p.user)
    .map((p: any) => {
      const selections: Record<string, string> = p.selections || {};
      const outcomes: Record<string, boolean | null> = {};
      for (const [gid, teamAbv] of Object.entries(selections)) {
        const winner = gameIdToWinner.get(gid);
        outcomes[gid] = winner ? winner === (teamAbv as string) : null;
      }
      return {
        _id: p._id,
        user: p.user,
        week: p.week,
        selections: p.selections || {},
        outcomes,
        lockOfWeek: p.lockOfWeek || null,
        touchdownScorer: p.touchdownScorer || null,
        propBet: p.propBet || null,
        propBetOdds: p.propBetOdds || null,
        isFinalized: !!p.isFinalized,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

  // Disable caching for dynamic picks feed
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  return res.status(200).json(ApiResponse.success(enriched));
};

export const getWeeksWithFinalizedPicks = async (
  req: Request,
  res: Response
) => {
  const weeks: number[] = await Pick.distinct("week", { isFinalized: true });
  const sorted = (weeks || [])
    .map((w: any) => Number(w))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  return res.status(200).json(ApiResponse.success(sorted));
};
