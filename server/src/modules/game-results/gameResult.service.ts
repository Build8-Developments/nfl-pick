import { getNFLBoxScore, Tank01APIError, validateGameID, is2025SeasonGame } from "../../api/tank01.js";
import type { Tank01BoxScoreResponse } from "../../api/tank01.js";
import type { IGameResult } from "./gameResult.model.js";
import GameResult from "./gameResult.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ScoringService } from "../scoring/scoring.service.js";

export class GameResultService {
  /**
   * Fetch live box score data from Tank01 API and save to database
   */
  static async fetchAndSaveGameResult(gameID: string): Promise<{
    success: boolean;
    message: string;
    gameResult: IGameResult | null;
    error?: string;
  }> {
    try {
      // Validate game ID format
      if (!validateGameID(gameID)) {
        return {
          success: false,
          message: `Invalid game ID format: ${gameID}`,
          gameResult: null,
          error: "INVALID_GAME_ID_FORMAT",
        };
      }

      // Check if it's a 2025 season game
      if (!is2025SeasonGame(gameID)) {
        return {
          success: false,
          message: `Game is not from 2025 season: ${gameID}`,
          gameResult: null,
          error: "NOT_2025_SEASON",
        };
      }

      console.log(`[GameResultService] Fetching box score for game: ${gameID}`);

      // Fetch data from Tank01 API
      const boxScoreData = await getNFLBoxScore(gameID, {
        playByPlay: true,
        fantasyPoints: true,
      });

      // Extract week and season from gameID
      const gameDate = gameID.substring(0, 8);
      const year = parseInt(gameDate.substring(0, 4));
      const month = parseInt(gameDate.substring(4, 6));
      const day = parseInt(gameDate.substring(6, 8));
      
      // Calculate week based on NFL season start (first Thursday after Sep 1st)
      const seasonStart = new Date(year, 8, 1); // September 1st
      const firstThursday = new Date(seasonStart);
      const dayOfWeek = seasonStart.getDay();
      const daysToThursday = (4 - dayOfWeek + 7) % 7; // 4 = Thursday
      firstThursday.setDate(seasonStart.getDate() + daysToThursday);
      
      const gameDateObj = new Date(year, month - 1, day);
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      const week = Math.floor((gameDateObj.getTime() - firstThursday.getTime()) / msPerWeek) + 1;
      const weekClamped = Math.min(Math.max(week, 1), 18);

      // Determine winner
      const winner = ScoringService.determineWinner(
        boxScoreData.homeScore,
        boxScoreData.awayScore,
        boxScoreData.homeTeam,
        boxScoreData.awayTeam
      );

      // Calculate fantasy points for all players
      const playerStatsWithFantasy = boxScoreData.homeTeamPlayers.concat(boxScoreData.awayTeamPlayers).map(player => ({
        ...player,
        fantasyPoints: ScoringService.calculatePlayerFantasyPoints(player),
      }));

      // Prepare game result data
      const gameResultData: Partial<IGameResult> = {
        gameID: boxScoreData.gameID,
        season: year,
        week: weekClamped,
        homeTeam: boxScoreData.homeTeam,
        awayTeam: boxScoreData.awayTeam,
        teamIDHome: boxScoreData.teamIDHome,
        teamIDAway: boxScoreData.teamIDAway,
        homeScore: boxScoreData.homeScore,
        awayScore: boxScoreData.awayScore,
        winner,
        gameStatus: boxScoreData.gameStatus,
        quarter: boxScoreData.quarter,
        timeRemaining: boxScoreData.timeRemaining,
        lastUpdated: boxScoreData.lastUpdated,
        isFinal: boxScoreData.gameStatus === "FINAL" || boxScoreData.gameStatus === "COMPLETED",
        homeTeamStats: {
          totalYards: boxScoreData.homeTeamStats.totalYards,
          passingYards: boxScoreData.homeTeamStats.passingYards,
          rushingYards: boxScoreData.homeTeamStats.rushingYards,
          turnovers: boxScoreData.homeTeamStats.turnovers,
          penalties: boxScoreData.homeTeamStats.penalties,
          timeOfPossession: boxScoreData.homeTeamStats.timeOfPossession,
          firstDowns: boxScoreData.homeTeamStats.firstDowns,
          thirdDownConversions: boxScoreData.homeTeamStats.thirdDownConversions,
          thirdDownAttempts: boxScoreData.homeTeamStats.thirdDownAttempts,
          fourthDownConversions: boxScoreData.homeTeamStats.fourthDownConversions,
          fourthDownAttempts: boxScoreData.homeTeamStats.fourthDownAttempts,
          redZoneAttempts: boxScoreData.homeTeamStats.redZoneAttempts,
          redZoneScores: boxScoreData.homeTeamStats.redZoneScores,
        },
        awayTeamStats: {
          totalYards: boxScoreData.awayTeamStats.totalYards,
          passingYards: boxScoreData.awayTeamStats.passingYards,
          rushingYards: boxScoreData.awayTeamStats.rushingYards,
          turnovers: boxScoreData.awayTeamStats.turnovers,
          penalties: boxScoreData.awayTeamStats.penalties,
          timeOfPossession: boxScoreData.awayTeamStats.timeOfPossession,
          firstDowns: boxScoreData.awayTeamStats.firstDowns,
          thirdDownConversions: boxScoreData.awayTeamStats.thirdDownConversions,
          thirdDownAttempts: boxScoreData.awayTeamStats.thirdDownAttempts,
          fourthDownConversions: boxScoreData.awayTeamStats.fourthDownConversions,
          fourthDownAttempts: boxScoreData.awayTeamStats.fourthDownAttempts,
          redZoneAttempts: boxScoreData.awayTeamStats.redZoneAttempts,
          redZoneScores: boxScoreData.awayTeamStats.redZoneScores,
        },
        playerStats: playerStatsWithFantasy.map(player => ({
          playerID: player.playerID,
          playerName: player.playerName,
          position: player.position,
          teamID: player.teamID,
          teamAbv: player.teamID === boxScoreData.teamIDHome ? boxScoreData.homeTeam : boxScoreData.awayTeam,
          passAttempts: player.passAttempts || 0,
          passCompletions: player.passCompletions || 0,
          passYards: player.passYards || 0,
          passTD: player.passTD || 0,
          passInterceptions: player.passInterceptions || 0,
          carries: player.carries || 0,
          rushYards: player.rushYards || 0,
          rushTD: player.rushTD || 0,
          fumbles: player.fumbles || 0,
          receptions: player.receptions || 0,
          receivingYards: player.receivingYards || 0,
          receivingTD: player.receivingTD || 0,
          targets: player.targets || 0,
          fgMade: player.fgMade || 0,
          fgMissed: player.fgMissed || 0,
          xpMade: player.xpMade || 0,
          xpMissed: player.xpMissed || 0,
          totalTackles: player.totalTackles || 0,
          soloTackles: player.soloTackles || 0,
          tacklesForLoss: player.tacklesForLoss || 0,
          qbHits: player.qbHits || 0,
          interceptions: player.interceptions || 0,
          sacks: player.sacks || 0,
          passDeflections: player.passDeflections || 0,
          fumblesRecovered: player.fumblesRecovered || 0,
          fantasyPoints: player.fantasyPoints || 0,
        })),
        playByPlay: boxScoreData.playByPlay?.map(play => ({
          playID: play.playID,
          quarter: play.quarter,
          time: play.time,
          down: play.down,
          distance: play.distance,
          yardLine: play.yardLine,
          description: play.description,
          homeScore: play.homeScore,
          awayScore: play.awayScore,
          playType: play.playType,
          playerID: play.playerID,
          playerName: play.playerName,
        })) || [],
        fantasyPoints: {
          homeTeamTotal: ScoringService.calculateTeamFantasyPoints(boxScoreData.homeTeamPlayers),
          awayTeamTotal: ScoringService.calculateTeamFantasyPoints(boxScoreData.awayTeamPlayers),
          homeTeamPlayers: boxScoreData.fantasyPoints?.homeTeamPlayers || {},
          awayTeamPlayers: boxScoreData.fantasyPoints?.awayTeamPlayers || {},
        },
      };

      // Save or update game result
      const savedGameResult = await GameResult.findOneAndUpdate(
        { gameID },
        gameResultData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      console.log(`[GameResultService] Successfully saved game result for: ${gameID}`);

      return {
        success: true,
        message: `Game result saved successfully for ${gameID}`,
        gameResult: savedGameResult,
      };

    } catch (error) {
      console.error(`[GameResultService] Error fetching/saving game result for ${gameID}:`, error);

      if (error instanceof Tank01APIError) {
        return {
          success: false,
          message: error.message,
          gameResult: null,
          error: error.statusCode ? `API_ERROR_${error.statusCode}` : "API_ERROR",
        };
      }

      return {
        success: false,
        message: `Failed to fetch game result: ${error instanceof Error ? error.message : "Unknown error"}`,
        gameResult: null,
        error: "UNKNOWN_ERROR",
      };
    }
  }

  /**
   * Process live scoring for a game and update user scores
   */
  static async processLiveScoring(gameID: string): Promise<{
    success: boolean;
    message: string;
    scoringResults: any[];
    gameResult: IGameResult | null;
  }> {
    try {
      // First, fetch and save the latest game result
      const fetchResult = await this.fetchAndSaveGameResult(gameID);
      
      if (!fetchResult.success || !fetchResult.gameResult) {
        return {
          success: false,
          message: fetchResult.message,
          scoringResults: [],
          gameResult: null,
        };
      }

      // Process scoring for all users
      const scoringResult = await ScoringService.processGameScoring(gameID);
      
      if (!scoringResult.success) {
        return {
          success: false,
          message: scoringResult.message,
          scoringResults: [],
          gameResult: fetchResult.gameResult,
        };
      }

      return {
        success: true,
        message: `Live scoring processed for ${gameID}`,
        scoringResults: scoringResult.results,
        gameResult: fetchResult.gameResult,
      };

    } catch (error) {
      console.error(`[GameResultService] Error processing live scoring for ${gameID}:`, error);
      return {
        success: false,
        message: `Failed to process live scoring: ${error instanceof Error ? error.message : "Unknown error"}`,
        scoringResults: [],
        gameResult: null,
      };
    }
  }

  /**
   * Get game result by gameID
   */
  static async getGameResult(gameID: string): Promise<IGameResult | null> {
    try {
      return await GameResult.findOne({ gameID });
    } catch (error) {
      console.error(`[GameResultService] Error getting game result for ${gameID}:`, error);
      return null;
    }
  }

  /**
   * Get all game results for a specific week
   */
  static async getWeekGameResults(week: number, season: number): Promise<IGameResult[]> {
    try {
      return await GameResult.find({ week, season }).sort({ gameDate: 1 });
    } catch (error) {
      console.error(`[GameResultService] Error getting week ${week} game results:`, error);
      return [];
    }
  }

  /**
   * Get active games (not final) for a specific week
   */
  static async getActiveGames(week: number, season: number): Promise<IGameResult[]> {
    try {
      return await GameResult.find({ 
        week, 
        season, 
        isFinal: false 
      }).sort({ gameDate: 1 });
    } catch (error) {
      console.error(`[GameResultService] Error getting active games for week ${week}:`, error);
      return [];
    }
  }
}
