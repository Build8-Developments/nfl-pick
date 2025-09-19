import { FANTASY_SCORING_RULES } from "../../api/tank01.js";
import type { PlayerStats } from "../../api/tank01.js";
import type { IScoring } from "./scoring.model.js";
import Scoring from "./scoring.model.js";
import Pick, { type IPick } from "../picks/pick.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  GameBoxscore,
  type BoxscoreDocument,
} from "../gameboxscore/boxscore.model.js";
import mongoose from "mongoose";

// Define IGameResult interface locally since the game-results module was removed
export interface IGameResult {
  gameID: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  winner: string;
  isFinal: boolean;
  gameStatus: string;
  playerStats: PlayerStats[];
}

export interface ScoringResult {
  user: string;
  gameID: string;
  week: number;
  season: number;
  totalPoints: number;
  fantasyPoints: number;
  pickResults: {
    spreadPick?: {
      selectedTeam: string;
      actualWinner: string;
      isCorrect: boolean;
      points: number;
    };
    lockPick?: {
      selectedTeam: string;
      actualWinner: string;
      isCorrect: boolean;
      points: number;
    };
    touchdownScorer?: {
      selectedPlayer: string;
      selectedPlayerName: string;
      actualScorer: string;
      actualScorerName: string;
      isCorrect: boolean;
      points: number;
    };
    propBet?: {
      description: string;
      isCorrect: boolean;
      points: number;
    };
  };
  gameContext: {
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    winner: string;
    gameStatus: string;
    isFinal: boolean;
  };
}

// Interface for the result of a user's weekly picks calculation
export interface UserWeeklyResult {
  userId: string;
  username: string;
  week: number;
  season: number;
  points: number;
  spreadCorrect: number;
  spreadTotal: number;
  lockCorrect: boolean;
  tdScorerCorrect: boolean;
  propBetCorrect: boolean;
  gameResults: {
    gameId: string;
    homeTeam: string;
    awayTeam: string;
    result: string;
    pick: string;
    correct: boolean;
  }[];
}

export class ScoringService {
  /**
   * Calculate weekly points for all users
   * This is the main method that implements the points system:
   * +1 per correct spread select
   * +1 per correct lock of the week (if the team won)
   * +1 for TD scorer player
   * +1 prop of the week (if approved)
   */
  static async calculateWeeklyPoints(
    week: number,
    season: number
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // Step 1: Get all completed games for the week
      const gameBoxscores = await GameBoxscore.find({
        gameWeek: week,
        gameStatus: "Completed",
      });

      if (!gameBoxscores.length) {
        return {
          success: false,
          message: `No completed games found for week ${week}`,
        };
      }

      // Step 2: Get all finalized picks for the week
      const allPicks = await Pick.find({
        week,
        isFinalized: true,
      }).populate("user");

      if (!allPicks.length) {
        return {
          success: false,
          message: `No finalized picks found for week ${week}`,
        };
      }

      // Step 3: Calculate points for each user
      const userResults = await Promise.all(
        allPicks.map((userPick) =>
          this.calculateUserWeekPoints(userPick, gameBoxscores, week, season)
        )
      );

      // Step 4: Update user points in the database
      await Promise.all(
        userResults.map(async (result: UserWeeklyResult) => {
          // Sum up all points earned by this user across all games
          const userTotalPoints = result.points;

          // Update user's total points
          await mongoose.model("User").findByIdAndUpdate(result.userId, {
            $inc: { points: userTotalPoints },
          });
        })
      );

      return {
        success: true,
        message: `Successfully calculated points for week ${week}`,
        data: { userResults },
      };
    } catch (error) {
      console.error(`Error calculating weekly points: ${error}`);
      return {
        success: false,
        message: `Error calculating points: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * Calculate points for a single user based on their picks for the week
   */
  static async calculateUserWeekPoints(
    userPick: IPick,
    gameBoxscores: BoxscoreDocument[],
    week: number,
    season: number
  ): Promise<UserWeeklyResult> {
    // Initialize result object
    const result: UserWeeklyResult = {
      userId: userPick.user.toString(),
      username: (userPick.user as any).username || "Unknown", // We expect user to be populated
      week,
      season,
      points: 0,
      spreadCorrect: 0,
      spreadTotal: 0,
      lockCorrect: false,
      tdScorerCorrect: false,
      propBetCorrect: false,
      gameResults: [],
    };

    // Process spread selections
    if (userPick.selections) {
      for (const [gameId, selectedTeam] of Object.entries(
        userPick.selections
      )) {
        // Find matching game
        const game = gameBoxscores.find((g) => g.gameId === gameId);
        if (!game) continue;

        // Determine winner
        const winner =
          game.home.result === "W"
            ? game.home.teamAvbr
            : game.away.result === "W"
            ? game.away.teamAvbr
            : "TIE";

        // Check if user's pick was correct
        const correct = selectedTeam === winner && winner !== "TIE";

        // +1 point for correct spread selection
        if (correct) {
          result.points += 1;
          result.spreadCorrect += 1;
        }

        result.spreadTotal += 1;

        // Add to game results
        result.gameResults.push({
          gameId,
          homeTeam: game.home.teamAvbr,
          awayTeam: game.away.teamAvbr,
          result: winner,
          pick: selectedTeam,
          correct,
        });
      }
    }

    // Process lock of the week
    if (userPick.lockOfWeek) {
      // Find games with this team
      const lockTeamGame = gameBoxscores.find(
        (g) =>
          g.home.teamAvbr === userPick.lockOfWeek ||
          g.away.teamAvbr === userPick.lockOfWeek
      );

      if (lockTeamGame) {
        // Check if the lock team won
        const lockTeamWon =
          (lockTeamGame.home.teamAvbr === userPick.lockOfWeek &&
            lockTeamGame.home.result === "W") ||
          (lockTeamGame.away.teamAvbr === userPick.lockOfWeek &&
            lockTeamGame.away.result === "W");

        // +1 point for correct lock of the week
        if (lockTeamWon) {
          result.points += 1;
          result.lockCorrect = true;
        }
      }
    }

    // Process touchdown scorer
    if (userPick.touchdownScorer) {
      let tdScorerFound = false;

      // Check all games for the TD scorer
      for (const game of gameBoxscores) {
        const tdPlays = game.scoringPlays.filter(
          (play) => play.scoreType === "TD"
        );

        // Check if the player scored a TD in any game
        for (const tdPlay of tdPlays) {
          if (tdPlay.playerIDs.includes(userPick.touchdownScorer)) {
            result.points += 1;
            result.tdScorerCorrect = true;
            tdScorerFound = true;
            break;
          }
        }

        if (tdScorerFound) break;
      }
    }

    // Process prop bet (simplified)
    if (userPick.propBet && userPick.propBetStatus === "approved") {
      // Prop bets are manually evaluated and marked as approved by admin
      result.points += 1;
      result.propBetCorrect = true;
    }

    return result;
  }

  /**
   * Get user's total scoring points for the season
   */
  static async getUserSeasonPoints(
    userId: string,
    season: number
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const user = await mongoose.model("User").findById(userId);

      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      return {
        success: true,
        data: {
          userId: user._id,
          username: user.username,
          totalPoints: user.points,
        },
        message: "User total points retrieved successfully",
      };
    } catch (error) {
      console.error("[ScoringService] Error in getUserSeasonPoints:", error);
      return {
        success: false,
        message: "Failed to retrieve user season points",
      };
    }
  }

  /**
   * Get weekly summary for all users - shows points breakdown
   */
  static async getWeeklySummary(
    week: number,
    season: number
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      // Get all picks for the week
      const allPicks = await Pick.find({
        week,
        isFinalized: true,
      }).populate("user");

      if (!allPicks.length) {
        return {
          success: true,
          data: {
            week,
            season,
            totalUsers: 0,
            userResults: [],
            summary: {
              totalSpreadPoints: 0,
              totalLockPoints: 0,
              totalTdScorerPoints: 0,
              totalPropBetPoints: 0,
              totalPoints: 0,
            },
          },
          message: `No finalized picks found for week ${week}`,
        };
      }

      // Get completed games for the week
      const gameBoxscores = await GameBoxscore.find({
        gameWeek: week,
        gameStatus: "Completed",
      });

      // Calculate points for each user
      const userResults = await Promise.all(
        allPicks.map((userPick) =>
          this.calculateUserWeekPoints(userPick, gameBoxscores, week, season)
        )
      );

      // Calculate summary statistics
      const summary = {
        totalSpreadPoints: userResults.reduce(
          (sum, result) => sum + result.spreadCorrect,
          0
        ),
        totalLockPoints: userResults.filter((result) => result.lockCorrect)
          .length,
        totalTdScorerPoints: userResults.filter(
          (result) => result.tdScorerCorrect
        ).length,
        totalPropBetPoints: userResults.filter(
          (result) => result.propBetCorrect
        ).length,
        totalPoints: userResults.reduce(
          (sum, result) => sum + result.points,
          0
        ),
      };

      return {
        success: true,
        data: {
          week,
          season,
          totalUsers: allPicks.length,
          userResults: userResults.sort((a, b) => b.points - a.points), // Sort by points descending
          summary,
        },
        message: `Weekly summary retrieved successfully for week ${week}`,
      };
    } catch (error) {
      console.error("[ScoringService] Error in getWeeklySummary:", error);
      return {
        success: false,
        message: `Failed to retrieve weekly summary: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * Calculate fantasy points for a player based on their stats
   */
  static calculatePlayerFantasyPoints(playerStats: PlayerStats): number {
    let points = 0;

    // Passing stats
    if (playerStats.passYards) {
      points += playerStats.passYards * FANTASY_SCORING_RULES.passYards;
    }
    if (playerStats.passAttempts) {
      points += playerStats.passAttempts * FANTASY_SCORING_RULES.passAttempts;
    }
    if (playerStats.passTD) {
      points += playerStats.passTD * FANTASY_SCORING_RULES.passTD;
    }
    if (playerStats.passCompletions) {
      points +=
        playerStats.passCompletions * FANTASY_SCORING_RULES.passCompletions;
    }
    if (playerStats.passInterceptions) {
      points +=
        playerStats.passInterceptions * FANTASY_SCORING_RULES.passInterceptions;
    }

    // Rushing stats
    if (playerStats.carries) {
      points += playerStats.carries * FANTASY_SCORING_RULES.carries;
    }
    if (playerStats.rushYards) {
      points += playerStats.rushYards * FANTASY_SCORING_RULES.rushYards;
    }
    if (playerStats.rushTD) {
      points += playerStats.rushTD * FANTASY_SCORING_RULES.rushTD;
    }
    if (playerStats.fumbles) {
      points += playerStats.fumbles * FANTASY_SCORING_RULES.fumbles;
    }

    // Receiving stats
    if (playerStats.receptions) {
      points +=
        playerStats.receptions * FANTASY_SCORING_RULES.pointsPerReception;
    }
    if (playerStats.receivingYards) {
      points +=
        playerStats.receivingYards * FANTASY_SCORING_RULES.receivingYards;
    }
    if (playerStats.receivingTD) {
      points += playerStats.receivingTD * FANTASY_SCORING_RULES.receivingTD;
    }
    if (playerStats.targets) {
      points += playerStats.targets * FANTASY_SCORING_RULES.targets;
    }

    // Kicking stats
    if (playerStats.fgMade) {
      points += playerStats.fgMade * FANTASY_SCORING_RULES.fgMade;
    }
    if (playerStats.fgMissed) {
      points += playerStats.fgMissed * FANTASY_SCORING_RULES.fgMissed;
    }
    if (playerStats.xpMade) {
      points += playerStats.xpMade * FANTASY_SCORING_RULES.xpMade;
    }
    if (playerStats.xpMissed) {
      points += playerStats.xpMissed * FANTASY_SCORING_RULES.xpMissed;
    }

    // Defense stats
    if (playerStats.totalTackles) {
      points +=
        playerStats.totalTackles * FANTASY_SCORING_RULES.idpTotalTackles;
    }
    if (playerStats.soloTackles) {
      points += playerStats.soloTackles * FANTASY_SCORING_RULES.idpSoloTackles;
    }
    if (playerStats.tacklesForLoss) {
      points += playerStats.tacklesForLoss * FANTASY_SCORING_RULES.idpTFL;
    }
    if (playerStats.qbHits) {
      points += playerStats.qbHits * FANTASY_SCORING_RULES.idpQbHits;
    }
    if (playerStats.interceptions) {
      points += playerStats.interceptions * FANTASY_SCORING_RULES.idpInt;
    }
    if (playerStats.sacks) {
      points += playerStats.sacks * FANTASY_SCORING_RULES.idpSacks;
    }
    if (playerStats.passDeflections) {
      points +=
        playerStats.passDeflections * FANTASY_SCORING_RULES.idpPassDeflections;
    }
    if (playerStats.fumblesRecovered) {
      points +=
        playerStats.fumblesRecovered *
        FANTASY_SCORING_RULES.idpFumblesRecovered;
    }

    return Math.round(points * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate total fantasy points for a team
   */
  static calculateTeamFantasyPoints(playerStats: PlayerStats[]): number {
    return playerStats.reduce((total, player) => {
      return total + this.calculatePlayerFantasyPoints(player);
    }, 0);
  }

  /**
   * Determine the winner of a game based on scores
   */
  static determineWinner(
    homeScore: number,
    awayScore: number,
    homeTeam: string,
    awayTeam: string
  ): string {
    if (homeScore > awayScore) {
      return homeTeam;
    } else if (awayScore > homeScore) {
      return awayTeam;
    } else {
      return "TIE";
    }
  }

  /**
   * Find the player who scored the most touchdowns in a game
   */
  static findTopTouchdownScorer(
    playerStats: PlayerStats[]
  ): { playerID: string; playerName: string; touchdowns: number } | null {
    let topScorer = null;
    let maxTouchdowns = 0;

    for (const player of playerStats) {
      const totalTDs =
        (player.passTD || 0) + (player.rushTD || 0) + (player.receivingTD || 0);
      if (totalTDs > maxTouchdowns) {
        maxTouchdowns = totalTDs;
        topScorer = {
          playerID: player.playerID,
          playerName: player.playerName,
          touchdowns: totalTDs,
        };
      }
    }

    return maxTouchdowns > 0 ? topScorer : null;
  }

  /**
   * Get user's scoring for a specific week
   */
  static async getUserWeekScoring(
    userId: string,
    week: number,
    season: number
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const scoringRecords = await Scoring.find({
        user: userId,
        week,
        season,
      });

      if (scoringRecords.length === 0) {
        return {
          success: true,
          data: {
            totalPoints: 0,
            fantasyPoints: 0,
            correctPicks: 0,
            totalPicks: 0,
            gameResults: [],
          },
          message: "No scoring records found for this week",
        };
      }

      const totalPoints = scoringRecords.reduce(
        (sum, record) => sum + record.pointsEarned,
        0
      );
      const fantasyPoints = scoringRecords.reduce(
        (sum, record) => sum + record.fantasyPoints,
        0
      );
      const correctPicks = scoringRecords.filter(
        (record) => record.pickCorrect
      ).length;
      const totalPicks = scoringRecords.length;

      return {
        success: true,
        data: {
          totalPoints,
          fantasyPoints,
          correctPicks,
          totalPicks,
          gameResults: scoringRecords.map((record) => ({
            gameID: record.gameID,
            homeTeam: record.homeTeam,
            awayTeam: record.awayTeam,
            homeScore: record.homeScore,
            awayScore: record.awayScore,
            winner: record.winner,
            pointsEarned: record.pointsEarned,
            fantasyPoints: record.fantasyPoints,
            pickCorrect: record.pickCorrect,
          })),
        },
        message: "User scoring retrieved successfully",
      };
    } catch (error) {
      console.error("[ScoringService] Error in getUserWeekScoring:", error);
      return {
        success: false,
        message: "Failed to retrieve user scoring",
      };
    }
  }

  /**
   * Evaluate a user's picks against game results
   */
  static evaluateUserPicks(
    userPick: any,
    gameResult: IGameResult,
    week: number,
    season: number
  ): ScoringResult {
    const winner = this.determineWinner(
      gameResult.homeScore,
      gameResult.awayScore,
      gameResult.homeTeam,
      gameResult.awayTeam
    );

    const pickResults: ScoringResult["pickResults"] = {};
    let totalPoints = 0;
    let fantasyPoints = 0;

    // Evaluate spread pick (if user has a pick for this game)
    if (userPick.selections && userPick.selections[gameResult.gameID]) {
      const selectedTeam = userPick.selections[gameResult.gameID];
      const isCorrect = selectedTeam === winner;
      const points = isCorrect ? 1 : 0; // 1 point for correct spread pick

      pickResults.spreadPick = {
        selectedTeam,
        actualWinner: winner,
        isCorrect,
        points,
      };
      totalPoints += points;
    }

    // Evaluate lock pick (if it's for this game)
    if (
      userPick.lockOfWeek &&
      (userPick.lockOfWeek === gameResult.homeTeam ||
        userPick.lockOfWeek === gameResult.awayTeam)
    ) {
      const selectedTeam = userPick.lockOfWeek;
      const isCorrect = selectedTeam === winner;
      const points = isCorrect ? 1 : 0; // 1 point for correct lock pick

      pickResults.lockPick = {
        selectedTeam,
        actualWinner: winner,
        isCorrect,
        points,
      };
      totalPoints += points;
    }

    // Evaluate touchdown scorer (if specified)
    if (userPick.touchdownScorer) {
      const topScorer = this.findTopTouchdownScorer(gameResult.playerStats);
      const isCorrect =
        topScorer && topScorer.playerID === userPick.touchdownScorer;
      const points = isCorrect ? 1 : 0; // 1 point for correct TD scorer

      pickResults.touchdownScorer = {
        selectedPlayer: userPick.touchdownScorer,
        selectedPlayerName: userPick.touchdownScorerName || "Unknown Player",
        actualScorer: topScorer?.playerID || "",
        actualScorerName: topScorer?.playerName || "No TD Scorer",
        isCorrect: isCorrect || false,
        points,
      };
      totalPoints += points;
    }

    // Evaluate prop bet (if specified)
    if (userPick.propBet) {
      // For prop bets, we check if the status is approved
      const isCorrect = userPick.propBetStatus === "approved";
      const points = isCorrect ? 1 : 0; // 1 point for approved prop bet

      pickResults.propBet = {
        description: userPick.propBet,
        isCorrect,
        points,
      };
      totalPoints += points;
    }

    // Calculate fantasy points for the user's selected players
    if (userPick.touchdownScorer) {
      const selectedPlayer = gameResult.playerStats.find(
        (p) => p.playerID === userPick.touchdownScorer
      );
      if (selectedPlayer) {
        fantasyPoints = this.calculatePlayerFantasyPoints(selectedPlayer);
      }
    }

    return {
      user: userPick.user.toString(),
      gameID: gameResult.gameID,
      week,
      season,
      totalPoints,
      fantasyPoints,
      pickResults,
      gameContext: {
        homeTeam: gameResult.homeTeam,
        awayTeam: gameResult.awayTeam,
        homeScore: gameResult.homeScore,
        awayScore: gameResult.awayScore,
        winner,
        gameStatus: gameResult.gameStatus,
        isFinal: gameResult.isFinal,
      },
    };
  }
}
