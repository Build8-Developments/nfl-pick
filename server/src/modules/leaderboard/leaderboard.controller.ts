import type { Request, Response } from "express";
import Pick from "../picks/pick.model.js";

export const getLeaderboard = async (_req: Request, res: Response) => {
  // Aggregate wins/losses based on isCorrect flags when set
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
      $project: {
        user: "$_id",
        _id: 0,
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
  res.json({ success: true, data: rows });
};


