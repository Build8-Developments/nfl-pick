import type { Request, Response } from "express";
import { ScoringService } from "../scoring/scoring.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { validateGameID, is2025SeasonGame } from "../../api/tank01.js";
import Scoring from "../scoring/scoring.model.js";
import Game from "../games/games.model.js";

export const fetchGameResult = async (req: Request, res: Response) => {
  try {
    const { gameID } = req.params;

    if (!gameID) {
      return res.status(400).json(ApiResponse.error("Game ID is required"));
    }

    // Validate game ID format
    if (!validateGameID(gameID)) {
      return res
        .status(400)
        .json(ApiResponse.error(`Invalid game ID format: ${gameID}`));
    }

    // Check if it's a 2025 season game
    if (!is2025SeasonGame(gameID)) {
      return res
        .status(400)
        .json(ApiResponse.error(`Game is not from 2025 season: ${gameID}`));
    }

    // Find existing scoring records for this game to get game result data
    const scoringRecord = await Scoring.findOne({ gameID });

    if (!scoringRecord) {
      return res
        .status(404)
        .json(ApiResponse.error(`No game result found for gameID: ${gameID}`));
    }

    const gameResult = {
      gameID: scoringRecord.gameID,
      homeTeam: scoringRecord.homeTeam,
      awayTeam: scoringRecord.awayTeam,
      homeScore: scoringRecord.homeScore,
      awayScore: scoringRecord.awayScore,
      winner: scoringRecord.winner,
      isFinal: scoringRecord.isFinal,
      gameStatus: scoringRecord.gameStatus,
    };

    return res.json(
      ApiResponse.success(gameResult, "Game result retrieved successfully")
    );
  } catch (error) {
    console.error("[LiveScoring] Error in fetchGameResult:", error);
    return res.status(500).json(ApiResponse.error("Internal server error"));
  }
};

export const processLiveScoring = async (req: Request, res: Response) => {
  try {
    const { gameID } = req.params;

    if (!gameID) {
      return res.status(400).json(ApiResponse.error("Game ID is required"));
    }

    // Validate game ID format
    if (!validateGameID(gameID)) {
      return res
        .status(400)
        .json(ApiResponse.error(`Invalid game ID format: ${gameID}`));
    }

    // Check if it's a 2025 season game
    if (!is2025SeasonGame(gameID)) {
      return res
        .status(400)
        .json(ApiResponse.error(`Game is not from 2025 season: ${gameID}`));
    }

    // Get all scoring records for this game
    const scoringRecords = await Scoring.find({ gameID });

    if (scoringRecords.length === 0) {
      return res
        .status(404)
        .json(
          ApiResponse.error(`No scoring records found for gameID: ${gameID}`)
        );
    }

    // Get game result from first scoring record
    const firstRecord = scoringRecords[0];
    if (!firstRecord) {
      return res
        .status(404)
        .json(
          ApiResponse.error(`No scoring records found for gameID: ${gameID}`)
        );
    }

    const gameResult = {
      gameID: firstRecord.gameID,
      homeTeam: firstRecord.homeTeam,
      awayTeam: firstRecord.awayTeam,
      homeScore: firstRecord.homeScore,
      awayScore: firstRecord.awayScore,
      winner: firstRecord.winner,
      isFinal: firstRecord.isFinal,
      gameStatus: firstRecord.gameStatus,
    };

    return res.json(
      ApiResponse.success(
        {
          gameResult,
          scoringResults: scoringRecords,
          summary: {
            totalUsers: scoringRecords.length,
            gameID: gameResult.gameID,
            homeTeam: gameResult.homeTeam,
            awayTeam: gameResult.awayTeam,
            homeScore: gameResult.homeScore,
            awayScore: gameResult.awayScore,
            winner: gameResult.winner,
            isFinal: gameResult.isFinal,
          },
        },
        "Live scoring processed successfully"
      )
    );
  } catch (error) {
    console.error("[LiveScoring] Error in processLiveScoring:", error);
    return res.status(500).json(ApiResponse.error("Internal server error"));
  }
};

export const getGameResult = async (req: Request, res: Response) => {
  try {
    const { gameID } = req.params;

    if (!gameID) {
      return res.status(400).json(ApiResponse.error("Game ID is required"));
    }

    const scoringRecord = await Scoring.findOne({ gameID });

    if (!scoringRecord) {
      return res
        .status(404)
        .json(ApiResponse.error(`Game result not found for gameID: ${gameID}`));
    }

    const gameResult = {
      gameID: scoringRecord.gameID,
      homeTeam: scoringRecord.homeTeam,
      awayTeam: scoringRecord.awayTeam,
      homeScore: scoringRecord.homeScore,
      awayScore: scoringRecord.awayScore,
      winner: scoringRecord.winner,
      isFinal: scoringRecord.isFinal,
      gameStatus: scoringRecord.gameStatus,
    };

    return res.json(
      ApiResponse.success(gameResult, "Game result retrieved successfully")
    );
  } catch (error) {
    console.error("[LiveScoring] Error in getGameResult:", error);
    return res.status(500).json(ApiResponse.error("Internal server error"));
  }
};

export const getWeekResults = async (req: Request, res: Response) => {
  try {
    const { week, season } = req.query;

    if (!week || !season) {
      return res
        .status(400)
        .json(ApiResponse.error("Week and season are required"));
    }

    const weekNum = parseInt(week as string);
    const seasonNum = parseInt(season as string);

    if (isNaN(weekNum) || isNaN(seasonNum)) {
      return res
        .status(400)
        .json(ApiResponse.error("Week and season must be valid numbers"));
    }

    // Get unique game results for the week from scoring records
    const scoringRecords = await Scoring.find({
      week: weekNum,
      season: seasonNum,
    });

    // Group by gameID to get unique games
    const gameMap = new Map();
    scoringRecords.forEach((record) => {
      if (!gameMap.has(record.gameID)) {
        gameMap.set(record.gameID, {
          gameID: record.gameID,
          homeTeam: record.homeTeam,
          awayTeam: record.awayTeam,
          homeScore: record.homeScore,
          awayScore: record.awayScore,
          winner: record.winner,
          isFinal: record.isFinal,
          gameStatus: record.gameStatus,
        });
      }
    });

    const gameResults = Array.from(gameMap.values());

    return res.json(
      ApiResponse.success(
        gameResults,
        `Game results retrieved for week ${weekNum}, season ${seasonNum}`
      )
    );
  } catch (error) {
    console.error("[LiveScoring] Error in getWeekResults:", error);
    return res.status(500).json(ApiResponse.error("Internal server error"));
  }
};

export const getActiveGames = async (req: Request, res: Response) => {
  try {
    const { week, season } = req.query;

    if (!week || !season) {
      return res
        .status(400)
        .json(ApiResponse.error("Week and season are required"));
    }

    const weekNum = parseInt(week as string);
    const seasonNum = parseInt(season as string);

    if (isNaN(weekNum) || isNaN(seasonNum)) {
      return res
        .status(400)
        .json(ApiResponse.error("Week and season must be valid numbers"));
    }

    // Get active (non-final) games for the week from scoring records
    const scoringRecords = await Scoring.find({
      week: weekNum,
      season: seasonNum,
      isFinal: false,
    });

    // Group by gameID to get unique games
    const gameMap = new Map();
    scoringRecords.forEach((record) => {
      if (!gameMap.has(record.gameID)) {
        gameMap.set(record.gameID, {
          gameID: record.gameID,
          homeTeam: record.homeTeam,
          awayTeam: record.awayTeam,
          homeScore: record.homeScore,
          awayScore: record.awayScore,
          winner: record.winner,
          isFinal: record.isFinal,
          gameStatus: record.gameStatus,
        });
      }
    });

    const activeGames = Array.from(gameMap.values());

    return res.json(
      ApiResponse.success(
        activeGames,
        `Active games retrieved for week ${weekNum}, season ${seasonNum}`
      )
    );
  } catch (error) {
    console.error("[LiveScoring] Error in getActiveGames:", error);
    return res.status(500).json(ApiResponse.error("Internal server error"));
  }
};

export const getUserScoring = async (req: Request, res: Response) => {
  try {
    const { userId, week, season } = req.query;

    if (!userId || !week || !season) {
      return res
        .status(400)
        .json(ApiResponse.error("User ID, week, and season are required"));
    }

    const weekNum = parseInt(week as string);
    const seasonNum = parseInt(season as string);

    if (isNaN(weekNum) || isNaN(seasonNum)) {
      return res
        .status(400)
        .json(ApiResponse.error("Week and season must be valid numbers"));
    }

    const scoringResult = await ScoringService.getUserWeekScoring(
      userId as string,
      weekNum,
      seasonNum
    );

    if (!scoringResult.success) {
      return res
        .status(500)
        .json(ApiResponse.error("Failed to retrieve user scoring"));
    }

    return res.json(
      ApiResponse.success(
        scoringResult.data,
        "User scoring retrieved successfully"
      )
    );
  } catch (error) {
    console.error("[LiveScoring] Error in getUserScoring:", error);
    return res.status(500).json(ApiResponse.error("Internal server error"));
  }
};

export const getLiveLeaderboard = async (req: Request, res: Response) => {
  try {
    const { week, season } = req.query;

    console.log(
      `[LiveScoring] Getting live leaderboard for week ${week}, season ${season}`
    );

    if (!week || !season) {
      return res
        .status(400)
        .json(ApiResponse.error("Week and season are required"));
    }

    const weekNum = parseInt(week as string);
    const seasonNum = parseInt(season as string);

    if (isNaN(weekNum) || isNaN(seasonNum)) {
      return res
        .status(400)
        .json(ApiResponse.error("Week and season must be valid numbers"));
    }

    // Get leaderboard data from scoring records
    const pipeline: any[] = [
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
          totalPoints: 1,
          fantasyPoints: 1,
          correctPicks: 1,
          totalPicks: 1,
          winPercentage: {
            $cond: [
              { $gt: ["$totalPicks", 0] },
              { $divide: ["$correctPicks", "$totalPicks"] },
              0,
            ],
          },
        },
      },
      { $sort: { totalPoints: -1, fantasyPoints: -1, winPercentage: -1 } },
    ];

    const leaderboard = await Scoring.aggregate(pipeline);
    console.log(
      `[LiveScoring] Found ${leaderboard.length} weekly leaderboard records`
    );

    return res.json(
      ApiResponse.success(
        leaderboard,
        `Live leaderboard retrieved for week ${weekNum}, season ${seasonNum}`
      )
    );
  } catch (error) {
    console.error("[LiveScoring] Error in getLiveLeaderboard:", error);
    return res
      .status(500)
      .json(
        ApiResponse.error("Internal server error: " + (error as Error).message)
      );
  }
};
