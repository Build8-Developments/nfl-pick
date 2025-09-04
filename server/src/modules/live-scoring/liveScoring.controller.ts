import type { Request, Response } from "express";
import { GameResultService } from "../game-results/gameResult.service.js";
import { ScoringService } from "../scoring/scoring.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { validateGameID, is2025SeasonGame } from "../../api/tank01.js";
import Scoring from "../scoring/scoring.model.js";

export const fetchGameResult = async (req: Request, res: Response) => {
  try {
    const { gameID } = req.params;

    if (!gameID) {
      return res.status(400).json(
        ApiResponse.error("Game ID is required")
      );
    }

    // Validate game ID format
    if (!validateGameID(gameID)) {
      return res.status(400).json(
        ApiResponse.error(`Invalid game ID format: ${gameID}`)
      );
    }

    // Check if it's a 2025 season game
    if (!is2025SeasonGame(gameID)) {
      return res.status(400).json(
        ApiResponse.error(`Game is not from 2025 season: ${gameID}`)
      );
    }

    const result = await GameResultService.fetchAndSaveGameResult(gameID);

    if (!result.success) {
      const statusCode = result.error === "API_ERROR_404" ? 404 : 
                        result.error === "API_ERROR_429" ? 429 :
                        result.error === "API_ERROR_500" ? 502 : 400;
      
      return res.status(statusCode).json(
        ApiResponse.error(result.message)
      );
    }

    return res.json(
      ApiResponse.success(result.gameResult, result.message)
    );

  } catch (error) {
    console.error("[LiveScoring] Error in fetchGameResult:", error);
    return res.status(500).json(
      ApiResponse.error("Internal server error")
    );
  }
};

export const processLiveScoring = async (req: Request, res: Response) => {
  try {
    const { gameID } = req.params;

    if (!gameID) {
      return res.status(400).json(
        ApiResponse.error("Game ID is required")
      );
    }

    // Validate game ID format
    if (!validateGameID(gameID)) {
      return res.status(400).json(
        ApiResponse.error(`Invalid game ID format: ${gameID}`)
      );
    }

    // Check if it's a 2025 season game
    if (!is2025SeasonGame(gameID)) {
      return res.status(400).json(
        ApiResponse.error(`Game is not from 2025 season: ${gameID}`)
      );
    }

    const result = await GameResultService.processLiveScoring(gameID);

    if (!result.success) {
      return res.status(400).json(
        ApiResponse.error(result.message)
      );
    }

    return res.json(
      ApiResponse.success({
        gameResult: result.gameResult,
        scoringResults: result.scoringResults,
        summary: {
          totalUsers: result.scoringResults.length,
          gameID: result.gameResult?.gameID,
          homeTeam: result.gameResult?.homeTeam,
          awayTeam: result.gameResult?.awayTeam,
          homeScore: result.gameResult?.homeScore,
          awayScore: result.gameResult?.awayScore,
          winner: result.gameResult?.winner,
          isFinal: result.gameResult?.isFinal,
        }
      }, result.message)
    );

  } catch (error) {
    console.error("[LiveScoring] Error in processLiveScoring:", error);
    return res.status(500).json(
      ApiResponse.error("Internal server error")
    );
  }
};

export const getGameResult = async (req: Request, res: Response) => {
  try {
    const { gameID } = req.params;

    if (!gameID) {
      return res.status(400).json(
        ApiResponse.error("Game ID is required")
      );
    }

    const gameResult = await GameResultService.getGameResult(gameID);

    if (!gameResult) {
      return res.status(404).json(
        ApiResponse.error(`Game result not found for gameID: ${gameID}`)
      );
    }

    return res.json(
      ApiResponse.success(gameResult, "Game result retrieved successfully")
    );

  } catch (error) {
    console.error("[LiveScoring] Error in getGameResult:", error);
    return res.status(500).json(
      ApiResponse.error("Internal server error")
    );
  }
};

export const getWeekResults = async (req: Request, res: Response) => {
  try {
    const { week, season } = req.query;

    if (!week || !season) {
      return res.status(400).json(
        ApiResponse.error("Week and season are required")
      );
    }

    const weekNum = parseInt(week as string);
    const seasonNum = parseInt(season as string);

    if (isNaN(weekNum) || isNaN(seasonNum)) {
      return res.status(400).json(
        ApiResponse.error("Week and season must be valid numbers")
      );
    }

    const gameResults = await GameResultService.getWeekGameResults(weekNum, seasonNum);

    return res.json(
      ApiResponse.success(gameResults, `Game results retrieved for week ${weekNum}, season ${seasonNum}`)
    );

  } catch (error) {
    console.error("[LiveScoring] Error in getWeekResults:", error);
    return res.status(500).json(
      ApiResponse.error("Internal server error")
    );
  }
};

export const getActiveGames = async (req: Request, res: Response) => {
  try {
    const { week, season } = req.query;

    if (!week || !season) {
      return res.status(400).json(
        ApiResponse.error("Week and season are required")
      );
    }

    const weekNum = parseInt(week as string);
    const seasonNum = parseInt(season as string);

    if (isNaN(weekNum) || isNaN(seasonNum)) {
      return res.status(400).json(
        ApiResponse.error("Week and season must be valid numbers")
      );
    }

    const activeGames = await GameResultService.getActiveGames(weekNum, seasonNum);

    return res.json(
      ApiResponse.success(activeGames, `Active games retrieved for week ${weekNum}, season ${seasonNum}`)
    );

  } catch (error) {
    console.error("[LiveScoring] Error in getActiveGames:", error);
    return res.status(500).json(
      ApiResponse.error("Internal server error")
    );
  }
};

export const getUserScoring = async (req: Request, res: Response) => {
  try {
    const { userId, week, season } = req.query;

    if (!userId || !week || !season) {
      return res.status(400).json(
        ApiResponse.error("User ID, week, and season are required")
      );
    }

    const weekNum = parseInt(week as string);
    const seasonNum = parseInt(season as string);

    if (isNaN(weekNum) || isNaN(seasonNum)) {
      return res.status(400).json(
        ApiResponse.error("Week and season must be valid numbers")
      );
    }

    const scoringResult = await ScoringService.getUserWeekScoring(
      userId as string,
      weekNum,
      seasonNum
    );

    if (!scoringResult.success) {
      return res.status(500).json(
        ApiResponse.error("Failed to retrieve user scoring")
      );
    }

    return res.json(
      ApiResponse.success(scoringResult.data, "User scoring retrieved successfully")
    );

  } catch (error) {
    console.error("[LiveScoring] Error in getUserScoring:", error);
    return res.status(500).json(
      ApiResponse.error("Internal server error")
    );
  }
};

export const getLiveLeaderboard = async (req: Request, res: Response) => {
  try {
    const { week, season } = req.query;

    console.log(`[LiveScoring] Getting live leaderboard for week ${week}, season ${season}`);

    if (!week || !season) {
      return res.status(400).json(
        ApiResponse.error("Week and season are required")
      );
    }

    const weekNum = parseInt(week as string);
    const seasonNum = parseInt(season as string);

    if (isNaN(weekNum) || isNaN(seasonNum)) {
      return res.status(400).json(
        ApiResponse.error("Week and season must be valid numbers")
      );
    }

    // Get leaderboard data from scoring records
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
    console.log(`[LiveScoring] Found ${leaderboard.length} weekly leaderboard records`);

    return res.json(
      ApiResponse.success(leaderboard, `Live leaderboard retrieved for week ${weekNum}, season ${seasonNum}`)
    );

  } catch (error) {
    console.error("[LiveScoring] Error in getLiveLeaderboard:", error);
    return res.status(500).json(
      ApiResponse.error("Internal server error: " + (error as Error).message)
    );
  }
};
