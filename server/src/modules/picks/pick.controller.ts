import type { Request, Response } from "express";
import mongoose from "mongoose";
import { ApiResponse } from "../../utils/ApiResponse.js";
import Pick from "./pick.model.js";
import Game from "../games/games.model.js";
import UsedTdScorer from "./usedTdScorers.model.js";
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
      propBetStatus: pick?.propBetStatus,
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

    // Ensure propBetStatus is included in the response
    if (pick) {
      (pick as any).propBetStatus = pick.propBetStatus || "pending";
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
    // Check if picks are locked based on game timing rules
    const isPicksLocked = async () => {
      // Only check timing rules if there's an existing finalized pick
      if (!existing || !existing.isFinalized) return false;

      // Get all games for this week
      const weekGames = await Game.find({
        gameWeek: new RegExp(`\\b${weekNum}\\b`, "i"),
      }).lean();

      if (weekGames.length === 0) return false;

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

      // Check if any games have started (this locks ALL picks for the week)
      // Thursday night game - 10 minutes before kickoff
      const thursdayGame = weekGames.find((g) => {
        const gameDateTime = parseGameDateTime(
          (g as any).gameDate,
          (g as any).gameTime
        );
        return gameDateTime.getDay() === 4; // Thursday
      });

      if (thursdayGame) {
        const thursdayDateTime = parseGameDateTime(
          (thursdayGame as any).gameDate,
          (thursdayGame as any).gameTime
        );
        const lockoutTime = new Date(
          thursdayDateTime.getTime() - 10 * 60 * 1000
        ); // 10 minutes before
        if (now > lockoutTime) return true;
      }

      // Sunday games - before first kickoff
      const sundayGames = weekGames.filter((g) => {
        const gameDateTime = parseGameDateTime(
          (g as any).gameDate,
          (g as any).gameTime
        );
        return gameDateTime.getDay() === 0; // Sunday
      });

      if (sundayGames.length > 0) {
        const firstSundayGame = sundayGames.sort((a, b) => {
          const dateA = parseGameDateTime(
            (a as any).gameDate,
            (a as any).gameTime
          );
          const dateB = parseGameDateTime(
            (b as any).gameDate,
            (b as any).gameTime
          );
          return dateA.getTime() - dateB.getTime();
        })[0];

        const firstSundayGameDateTime = parseGameDateTime(
          (firstSundayGame as any).gameDate,
          (firstSundayGame as any).gameTime
        );
        if (now > firstSundayGameDateTime) return true;
      }

      // Monday games - 10 minutes before kickoff
      const mondayGames = weekGames.filter((g) => {
        const gameDateTime = parseGameDateTime(
          (g as any).gameDate,
          (g as any).gameTime
        );
        return gameDateTime.getDay() === 1; // Monday
      });

      if (mondayGames.length > 0) {
        const mondayGame = mondayGames[0]; // Assuming only one Monday game
        const mondayDateTime = parseGameDateTime(
          (mondayGame as any).gameDate,
          (mondayGame as any).gameTime
        );
        const lockoutTime = new Date(mondayDateTime.getTime() - 10 * 60 * 1000); // 10 minutes before
        if (now > lockoutTime) return true;
      }

      return false;
    };

    // Commented out global lockout check - individual game validation will handle this
    // const picksLocked = await isPicksLocked();
    // if (picksLocked) {
    //   console.warn("[PICKS] upsert denied: picks locked by timing rules", {
    //     userId: targetUserId,
    //     week: weekNum,
    //   });
    //   return res
    //     .status(400)
    //     .json(
    //       ApiResponse.error(
    //         "Picks are locked for this week based on game timing rules"
    //       )
    //     );
    // }

    // Lock validation: if finalizing, ensure no newly provided selection targets a game that has passed kickoff
    if (
      isFinalized &&
      normalizedSelections &&
      Object.keys(normalizedSelections).length > 0
    ) {
      const previouslySelected: Record<string, string> =
        (existing?.selections as Record<string, string>) || {};
      const newOrChangedEntries = Object.entries(normalizedSelections).filter(
        ([gid, team]) => previouslySelected[gid] !== team
      );
      const selectedGameIds = newOrChangedEntries
        .map(([gid]) => gid)
        .filter((k) => typeof k === "string" && k.length > 0);
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

    // TD Scorer uniqueness validation: check if player has been used before this season
    // But allow editing picks before the week starts
    if (touchdownScorer && touchdownScorer.trim().length > 0) {
      // Determine season dynamically: use September's year for NFL season label
      const now = new Date();
      const currentSeason =
        now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;

      // Check if this is an edit of an existing pick for the same week
      const isEditingSameWeek =
        existing && existing.touchdownScorer === touchdownScorer;

      // Only validate if not editing the same week with the same TD scorer
      if (!isEditingSameWeek) {
        const existingUsage = await UsedTdScorer.findOne({
          user: targetUserObjectId,
          season: currentSeason,
          playerId: touchdownScorer,
        });

        if (existingUsage) {
          // Check if the week where this player was used has already started
          const weekGames = await Game.find({
            gameWeek: new RegExp(`\\b${existingUsage.week}\\b`, "i"),
          }).lean();

          if (weekGames.length > 0) {
            const now = new Date();
            const parseGameDateTime = (
              gameDate: string | undefined,
              gameTime: string | undefined
            ) => {
              if (!gameDate || !gameTime) return new Date(8640000000000000);
              const yyyy = Number(gameDate.slice(0, 4));
              const mm = Number(gameDate.slice(4, 6));
              const dd = Number(gameDate.slice(6, 8));
              const m = gameTime
                .trim()
                .match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])/i);
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

            // Check if any game in the week where this player was used has started
            const weekHasStarted = weekGames.some((g) => {
              const gameDateTime = parseGameDateTime(
                (g as any).gameDate,
                (g as any).gameTime
              );
              const bufferMinutes = 15;
              const cutoffTime = new Date(
                gameDateTime.getTime() + bufferMinutes * 60 * 1000
              );
              return now > cutoffTime;
            });

            if (weekHasStarted) {
              console.warn(
                "[PICKS] upsert denied: TD scorer already used in a week that has started",
                {
                  userId: targetUserId,
                  week: weekNum,
                  playerId: touchdownScorer,
                  usedInWeek: existingUsage.week,
                }
              );
              return res.status(400).json(
                ApiResponse.error(
                  `You have already used this player as a TD scorer in week ${existingUsage.week}. Each player can only be selected once per season.`,
                  {
                    playerId: touchdownScorer,
                    usedInWeek: existingUsage.week,
                  }
                )
              );
            }
          }
        }
      }
    }

    // Finalization validation: ensure provided selections only target not-yet-started games this week
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
      const previouslySelected: Record<string, string> =
        (existing?.selections as Record<string, string>) || {};
      const selectionEntries = Object.entries(
        normalizedSelections || {}
      ).filter(([gid, team]) => previouslySelected[gid] !== team);
      const selectionCount = selectionEntries.length;

      if (weekGames.length === 0) {
        console.warn("[PICKS] upsert: no games found for week", {
          week: weekNum,
        });
        return res
          .status(400)
          .json(ApiResponse.error("No games found for this week"));
      }
      // Allow partial submissions - only validate that provided selections are valid
      if (selectionCount > 0) {
        const providedIds = new Set(selectionEntries.map(([gid]) => gid));
        const missingGameIds: string[] = [];
        for (const gid of eligibleGameIds) {
          if (!providedIds.has(gid)) missingGameIds.push(gid);
        }
        console.log("[PICKS] upsert: partial submission allowed", {
          requiredCount,
          providedCount: selectionCount,
          missingGameIds,
        });
      }
      // Ensure no newly provided selection targets an ineligible (already started) game
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
      // Only validate if provided - these are optional fields
      if (
        lockOfWeek !== undefined &&
        lockOfWeek !== null &&
        lockOfWeek !== ""
      ) {
        if (typeof lockOfWeek !== "string" || lockOfWeek.trim().length === 0) {
          missingFields.push("lockOfWeek");
        }
      }
      if (
        touchdownScorer !== undefined &&
        touchdownScorer !== null &&
        touchdownScorer !== ""
      ) {
        if (
          typeof touchdownScorer !== "string" ||
          touchdownScorer.trim().length === 0
        ) {
          missingFields.push("touchdownScorer");
        }
      }
      // Prop bet validation - only validate if provided
      if (propBet !== undefined && propBet !== null && propBet !== "") {
        if (typeof propBet !== "string" || propBet.trim().length === 0) {
          missingFields.push("propBet");
        }
      }
      if (
        propBetOdds !== undefined &&
        propBetOdds !== null &&
        propBetOdds !== ""
      ) {
        if (
          typeof propBetOdds !== "string" ||
          propBetOdds.trim().length === 0
        ) {
          missingFields.push("propBetOdds");
        }
      }
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

      // Optional: ensure lockOfWeek is among selected teams (only if lockOfWeek is provided)
      if (lockOfWeek && lockOfWeek.trim().length > 0) {
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
    }
    // Before saving, enforce cross-user uniqueness for lockOfWeek and touchdownScorer within the same week
    if (isFinalized) {
      // Only check if values are present
      if (lockOfWeek && lockOfWeek.trim().length > 0) {
        const conflict = await Pick.findOne({
          week: weekNum,
          isFinalized: true,
          lockOfWeek,
          // Exclude the current user's existing doc if any
          user: { $ne: targetUserObjectId },
        }).lean();
        if (conflict) {
          return res
            .status(400)
            .json(
              ApiResponse.error(
                "That Lock of the Week has already been taken this week by another user."
              )
            );
        }
      }
      if (touchdownScorer && touchdownScorer.trim().length > 0) {
        const conflict = await Pick.findOne({
          week: weekNum,
          isFinalized: true,
          touchdownScorer,
          user: { $ne: targetUserObjectId },
        }).lean();
        if (conflict) {
          return res
            .status(400)
            .json(
              ApiResponse.error(
                "That TD Scorer has already been taken this week by another user."
              )
            );
        }
      }
    }

    // Safer upsert flow to avoid rare duplicate key conflicts
    console.log("[PICKS] Saving pick with data:", {
      propBet,
      propBetOdds,
      isFinalized,
      selectionsCount: Object.keys(normalizedSelections).length,
      lockOfWeek,
      touchdownScorer,
    });

    // Build the update object, only including fields that have values
    // Merge selections with existing so we don't drop already-locked picks.
    const mergedSelections: Record<string, string> = {
      ...(existing?.selections || {}),
      ...normalizedSelections,
    };

    const updateData: any = {
      selections: mergedSelections,
      isFinalized: Boolean(isFinalized) || (existing?.isFinalized ?? false),
    };

    // Only add optional fields if they have values
    if (lockOfWeek && lockOfWeek.trim().length > 0) {
      updateData.lockOfWeek = lockOfWeek;
    }
    if (touchdownScorer && touchdownScorer.trim().length > 0) {
      updateData.touchdownScorer = touchdownScorer;
    }
    if (propBet && propBet.trim().length > 0) {
      updateData.propBet = propBet.trim();
      // Set prop bet status to pending when a new prop bet is submitted
      updateData.propBetStatus = "pending";
    } else if (propBet === "" || propBet === null) {
      // Clear prop bet if empty string or null
      updateData.propBet = "";
      updateData.propBetStatus = undefined; // Remove status when clearing
    }
    if (propBetOdds && propBetOdds.trim().length > 0) {
      updateData.propBetOdds = propBetOdds.trim();
    } else if (propBetOdds === "" || propBetOdds === null) {
      // Clear prop bet odds if empty string or null
      updateData.propBetOdds = "";
    }

    console.log("[PICKS] Update data:", updateData);

    const saved = await Pick.findOneAndUpdate(
      { user: targetUserObjectId, week: weekNum },
      {
        $set: updateData,
        $setOnInsert: { user: targetUserObjectId, week: weekNum },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    console.log("[PICKS] Saved pick:", {
      _id: saved?._id,
      propBet: saved?.propBet,
      propBetOdds: saved?.propBetOdds,
      isFinalized: saved?.isFinalized,
    });

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
    // Handle TD scorer usage tracking
    if (
      finalSaved?.isFinalized &&
      touchdownScorer &&
      touchdownScorer.trim().length > 0
    ) {
      try {
        const now = new Date();
        const currentSeason =
          now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;

        // If there was a previous TD scorer for this week, remove it from usage tracking
        if (
          existing &&
          existing.touchdownScorer &&
          existing.touchdownScorer !== touchdownScorer
        ) {
          await UsedTdScorer.deleteOne({
            user: targetUserObjectId,
            season: currentSeason,
            playerId: existing.touchdownScorer,
            week: weekNum,
          });
          console.log("[PICKS] Removed previous TD scorer usage", {
            userId: targetUserId,
            season: currentSeason,
            playerId: existing.touchdownScorer,
            week: weekNum,
          });
        }

        // Record the new TD scorer usage
        await UsedTdScorer.findOneAndUpdate(
          {
            user: targetUserObjectId,
            season: currentSeason,
            playerId: touchdownScorer,
            week: weekNum,
          },
          {
            user: targetUserObjectId,
            season: currentSeason,
            playerId: touchdownScorer,
            week: weekNum,
          },
          { upsert: true }
        );
        console.log("[PICKS] Recorded TD scorer usage", {
          userId: targetUserId,
          season: currentSeason,
          playerId: touchdownScorer,
          week: weekNum,
        });
      } catch (err: any) {
        console.error("[PICKS] Error recording TD scorer usage:", err);
      }
    } else if (
      finalSaved?.isFinalized &&
      existing &&
      existing.touchdownScorer &&
      !touchdownScorer
    ) {
      // If pick is finalized but TD scorer was removed, clean up the usage record
      try {
        const now = new Date();
        const currentSeason =
          now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
        await UsedTdScorer.deleteOne({
          user: targetUserObjectId,
          season: currentSeason,
          playerId: existing.touchdownScorer,
          week: weekNum,
        });
        console.log("[PICKS] Removed TD scorer usage (TD scorer cleared)", {
          userId: targetUserId,
          season: currentSeason,
          playerId: existing.touchdownScorer,
          week: weekNum,
        });
      } catch (err: any) {
        console.error("[PICKS] Error removing TD scorer usage:", err);
      }
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

      // Fetch the existing pick document for retry logic
      const existing = await Pick.findOne({
        user: targetUserObjectId,
        week: weekNum,
      }).lean();

      // Build the update object for retry, only including fields that have values
      const retryMergedSelections: Record<string, string> = {
        ...(existing?.selections || {}),
        ...normalizedSelections,
      };
      const retryUpdateData: any = {
        selections: retryMergedSelections,
        isFinalized: Boolean(isFinalized),
      };

      // Only add optional fields if they have values
      if (lockOfWeek && lockOfWeek.trim().length > 0) {
        retryUpdateData.lockOfWeek = lockOfWeek;
      }
      if (touchdownScorer && touchdownScorer.trim().length > 0) {
        retryUpdateData.touchdownScorer = touchdownScorer;
      }
      if (propBet && propBet.trim().length > 0) {
        retryUpdateData.propBet = propBet;
      }
      if (propBetOdds && propBetOdds.trim().length > 0) {
        retryUpdateData.propBetOdds = propBetOdds;
      }

      await Pick.findOneAndUpdate(
        { user: targetUserObjectId, week: weekNum },
        { $set: retryUpdateData }
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
        propBetStatus: p.propBetStatus || "pending",
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

// Get all prop bets for admin approval
export const getAllPropBets = async (req: Request, res: Response) => {
  try {
    console.log("[API] GET /picks/prop-bets - start");
    // Fetch ALL picks that have a non-empty prop bet, regardless of finalized status
    let picksWithPropBets = await Pick.find({
      propBet: { $exists: true, $ne: "", $regex: /\S/ },
    })
      .populate("user", "username email avatar")
      .sort({ createdAt: -1 })
      .lean();

    console.log(
      "[API] /picks/prop-bets - raw picks count:",
      picksWithPropBets?.length || 0
    );
    if (!picksWithPropBets || picksWithPropBets.length === 0) {
      // Fallback: broader query, then filter in memory
      const fallback = await Pick.find({
        $or: [
          { propBet: { $exists: true } },
          { propBetStatus: { $exists: true } },
        ],
      })
        .populate("user", "username email avatar")
        .sort({ createdAt: -1 })
        .lean();
      picksWithPropBets = (fallback || []).filter(
        (p: any) => typeof p.propBet === "string" && p.propBet.trim().length > 0
      );
      console.log(
        "[API] /picks/prop-bets - fallback raw count:",
        fallback?.length || 0,
        "filtered:",
        picksWithPropBets.length
      );
    }

    const propBets = (picksWithPropBets || []).map((pick: any) => ({
      _id: pick._id,
      user: {
        _id: pick.user?._id || null,
        username: pick.user?.username || "Unknown",
        avatar: pick.user?.avatar || "",
      },
      week: pick.week,
      propBet: pick.propBet,
      propBetOdds: pick.propBetOdds,
      status: pick.propBetStatus || "pending",
      submittedAt: pick.createdAt,
      approvedAt: pick.propBetApprovedAt,
      approvedBy: pick.propBetApprovedBy,
    }));
    console.log("[API] /picks/prop-bets - returning count:", propBets.length);
    return res.status(200).json(ApiResponse.success(propBets));
  } catch (error) {
    console.error("[API] /picks/prop-bets error", error);
    return res.status(500).json(ApiResponse.error("Failed to fetch prop bets"));
  }
};

// Update prop bet status (approve/reject)
export const updatePropBetStatus = async (req: Request, res: Response) => {
  try {
    const { propBetId } = req.params;
    const { status } = req.body;
    const adminUserId = req.user?._id; // Get admin user ID from auth middleware

    if (!propBetId || !status) {
      return res
        .status(400)
        .json(ApiResponse.error("Missing propBetId or status"));
    }

    if (!["approved", "rejected"].includes(status)) {
      return res
        .status(400)
        .json(ApiResponse.error("Status must be 'approved' or 'rejected'"));
    }

    const updateData = {
      propBetStatus: status,
      propBetApprovedAt: new Date(),
      propBetApprovedBy: adminUserId,
      // Only set resolved/correct if approved
      propBetResolved: status === "approved",
      propBetCorrect: status === "approved",
    };

    const updatedPick = await Pick.findByIdAndUpdate(propBetId, updateData, {
      new: true,
    }).populate("user", "username email avatar");

    if (!updatedPick) {
      return res.status(404).json(ApiResponse.error("Prop bet not found"));
    }

    console.log(`[PICKS] Prop bet ${status}:`, {
      propBetId,
      status,
      adminUserId,
      user: updatedPick.user,
    });

    return res.status(200).json(ApiResponse.success(updatedPick));
  } catch (error) {
    console.error("[PICKS] Error updating prop bet status:", error);
    return res
      .status(500)
      .json(ApiResponse.error("Failed to update prop bet status"));
  }
};

// Debug endpoint to check all picks
export const debugAllPicks = async (req: Request, res: Response) => {
  try {
    console.log("[DEBUG] Fetching all picks for debugging...");

    const allPicks = await Pick.find({}).lean();
    console.log("[DEBUG] Total picks found:", allPicks.length);

    const picksWithPropBets = allPicks.filter(
      (pick) =>
        pick.propBet &&
        pick.propBet !== null &&
        pick.propBet !== "" &&
        pick.propBet.trim().length > 0
    );

    console.log("[DEBUG] Picks with prop bets:", picksWithPropBets.length);

    const debugData = {
      totalPicks: allPicks.length,
      picksWithPropBetsCount: picksWithPropBets.length,
      allPicks: allPicks.map((pick) => ({
        _id: pick._id,
        week: pick.week,
        propBet: pick.propBet,
        propBetOdds: pick.propBetOdds,
        isFinalized: pick.isFinalized,
        user: pick.user,
      })),
      picksWithPropBets: picksWithPropBets.map((pick) => ({
        _id: pick._id,
        week: pick.week,
        propBet: pick.propBet,
        propBetOdds: pick.propBetOdds,
        isFinalized: pick.isFinalized,
        user: pick.user,
      })),
    };

    return res.status(200).json(ApiResponse.success(debugData));
  } catch (error) {
    console.error("[DEBUG] Error fetching debug data:", error);
    return res
      .status(500)
      .json(ApiResponse.error("Failed to fetch debug data"));
  }
};

// Simple test endpoint to create a test prop bet
export const createTestPropBet = async (req: Request, res: Response) => {
  try {
    console.log("[TEST] Creating test prop bet...");

    const testPick = new Pick({
      user: new mongoose.Types.ObjectId(),
      week: 1,
      selections: { test_game: "TEST" },
      propBet: "Test prop bet - Over 100 yards",
      propBetOdds: "+150",
      propBetStatus: "pending", // Include the new status field
      isFinalized: true,
    });

    const saved = await testPick.save();
    console.log("[TEST] Test prop bet created:", {
      _id: saved._id,
      propBet: saved.propBet,
      propBetStatus: saved.propBetStatus,
    });

    return res.status(200).json(ApiResponse.success(saved));
  } catch (error) {
    console.error("[TEST] Error creating test prop bet:", error);
    return res
      .status(500)
      .json(ApiResponse.error("Failed to create test prop bet"));
  }
};

// Debug endpoint to check prop bet status
export const debugPropBetStatus = async (req: Request, res: Response) => {
  try {
    console.log("[DEBUG] Checking prop bet status...");

    const allPicks = await Pick.find({
      propBet: { $exists: true, $ne: "" },
    }).lean();
    console.log("[DEBUG] Found picks with prop bets:", allPicks.length);

    const propBetStatuses = allPicks.map((pick) => ({
      _id: pick._id,
      propBet: pick.propBet,
      propBetStatus: pick.propBetStatus,
      propBetOdds: pick.propBetOdds,
      isFinalized: pick.isFinalized,
      createdAt: pick.createdAt,
    }));

    return res.status(200).json(
      ApiResponse.success({
        total: allPicks.length,
        propBets: propBetStatuses,
      })
    );
  } catch (error) {
    console.error("[DEBUG] Error checking prop bet status:", error);
    return res
      .status(500)
      .json(ApiResponse.error("Failed to check prop bet status"));
  }
};

// Debug endpoint to check all picks
export const debugAllPicksSimple = async (req: Request, res: Response) => {
  try {
    console.log("[DEBUG] Fetching all picks...");

    const allPicks = await Pick.find({}).lean();
    console.log("[DEBUG] Total picks in database:", allPicks.length);

    const picksWithPropBets = allPicks.filter(
      (pick) => pick.propBet && pick.propBet.trim().length > 0
    );

    console.log("[DEBUG] Picks with prop bets:", picksWithPropBets.length);

    const result = allPicks.map((pick) => ({
      _id: pick._id,
      user: pick.user,
      week: pick.week,
      propBet: pick.propBet,
      propBetOdds: pick.propBetOdds,
      propBetStatus: pick.propBetStatus,
      isFinalized: pick.isFinalized,
      createdAt: pick.createdAt,
      updatedAt: pick.updatedAt,
    }));

    return res.status(200).json(
      ApiResponse.success({
        total: allPicks.length,
        picksWithPropBets: picksWithPropBets.length,
        picks: result,
      })
    );
  } catch (error) {
    console.error("[DEBUG] Error fetching all picks:", error);
    return res.status(500).json(ApiResponse.error("Failed to fetch all picks"));
  }
};

// Simple test endpoint to check database connection (no auth required)
export const testDatabaseConnection = async (req: Request, res: Response) => {
  try {
    console.log("[TEST] Testing database connection...");

    const allPicks = await Pick.find({}).lean();
    console.log("[TEST] Total picks in database:", allPicks.length);

    const picksWithPropBets = allPicks.filter(
      (pick) => pick.propBet && pick.propBet.trim().length > 0
    );

    console.log("[TEST] Picks with prop bets:", picksWithPropBets.length);

    // Show detailed info about all picks
    const picksInfo = allPicks.map((pick) => ({
      _id: pick._id,
      week: pick.week,
      propBet: pick.propBet,
      propBetOdds: pick.propBetOdds,
      propBetStatus: pick.propBetStatus,
      isFinalized: pick.isFinalized,
      user: pick.user,
      createdAt: pick.createdAt,
    }));

    return res.status(200).json({
      success: true,
      message: "Database connection successful",
      data: {
        totalPicks: allPicks.length,
        picksWithPropBets: picksWithPropBets.length,
        allPicks: picksInfo,
      },
    });
  } catch (error) {
    console.error("[TEST] Database connection error:", error);
    return res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get used TD scorers for a user this season
export const getUsedTdScorers = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id as string;
    const currentSeason = 2024; // You might want to make this dynamic based on current year

    const usedScorers = await UsedTdScorer.find({
      user: userId,
      season: currentSeason,
    }).lean();

    const playerIds = usedScorers.map((usage) => usage.playerId);

    console.log("[PICKS] Retrieved used TD scorers", {
      userId,
      season: currentSeason,
      count: playerIds.length,
      playerIds,
    });

    return res.status(200).json(ApiResponse.success(playerIds));
  } catch (error) {
    console.error("[PICKS] Error fetching used TD scorers:", error);
    return res
      .status(500)
      .json(ApiResponse.error("Failed to fetch used TD scorers"));
  }
};
