import type { Request, Response } from "express";
import Pick from "../picks/pick.model.js";
import Scoring from "../scoring/scoring.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const { week, season, includeFantasy } = req.query;

    console.log("[Leaderboard] Getting leaderboard data...");

    // If specific week/season requested, use scoring data
    if (week && season) {
      const weekNum = parseInt(week as string);
      const seasonNum = parseInt(season as string);

      if (isNaN(weekNum) || isNaN(seasonNum)) {
        return res
          .status(400)
          .json(ApiResponse.error("Week and season must be valid numbers"));
      }

      const pipeline = [
        { $match: { week: weekNum, season: seasonNum } },
        {
          $group: {
            _id: "$user",
            totalPoints: { $sum: "$pointsEarned" },
            fantasyPoints: { $sum: "$fantasyPoints" },
            correctPicks: { $sum: { $cond: ["$pickCorrect", 1, 0] } },
            totalPicks: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        {
          $unwind: "$userInfo",
        },
        {
          $project: {
            user: "$_id",
            username: "$userInfo.username",
            avatar: "$userInfo.avatar",
            wins: "$correctPicks",
            losses: { $subtract: ["$totalPicks", "$correctPicks"] },
            winPct: {
              $cond: [
                { $gt: ["$totalPicks", 0] },
                { $divide: ["$correctPicks", "$totalPicks"] },
                0,
              ],
            },
            totalPoints: 1,
            fantasyPoints: includeFantasy === "true" ? 1 : 0,
          },
        },
        { $sort: { totalPoints: -1, fantasyPoints: -1, winPct: -1 } },
      ];

      const rows = await Scoring.aggregate(pipeline as any);
      return res.json(
        ApiResponse.success(rows, "Leaderboard retrieved successfully")
      );
    }

    // Default: aggregate wins/losses based on isCorrect flags when set
    const pipeline = [
      { $match: { isFinalized: true } },
      {
        $project: {
          user: 1,
          // Flatten selections count and outcomes once scoring worker populates per-game outcomes
          picksCount: { $size: { $objectToArray: "$selections" } },
          // Assume future: outcomes map stored; default to 0
          correctCount: {
            $cond: [
              { $gt: [{ $type: "$outcomes" }, "missing"] },
              {
                $size: {
                  $filter: {
                    input: { $objectToArray: "$outcomes" },
                    as: "o",
                    cond: { $eq: ["$$o.v", true] },
                  },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: "$user",
          wins: { $sum: "$correctCount" },
          picks: { $sum: "$picksCount" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $unwind: "$userInfo",
      },
      {
        $project: {
          user: "$_id",
          username: "$userInfo.username",
          avatar: "$userInfo.avatar",
          wins: 1,
          losses: { $subtract: ["$picks", "$wins"] },
          winPct: {
            $cond: [
              { $gt: ["$picks", 0] },
              { $divide: ["$wins", "$picks"] },
              0,
            ],
          },
        },
      },
      { $sort: { wins: -1, winPct: -1 } },
    ];

    const rows = await Pick.aggregate(pipeline as any);
    console.log(`[Leaderboard] Found ${rows.length} season standings records`);
    return res.json(
      ApiResponse.success(rows, "Leaderboard retrieved successfully")
    );
  } catch (error) {
    console.error("[Leaderboard] Error getting leaderboard:", error);
    return res
      .status(500)
      .json(
        ApiResponse.error(
          "Failed to retrieve leaderboard: " + (error as Error).message
        )
      );
  }
};
