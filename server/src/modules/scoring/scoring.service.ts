import { FANTASY_SCORING_RULES } from "../../api/tank01.js";
import type { PlayerStats } from "../../api/tank01.js";
import type { IGameResult } from "../game-results/gameResult.model.js";
import type { IScoring } from "./scoring.model.js";
import Scoring from "./scoring.model.js";
import Pick from "../picks/pick.model.js";
import GameResult from "../game-results/gameResult.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

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

export class ScoringService {
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
      points += playerStats.passCompletions * FANTASY_SCORING_RULES.passCompletions;
    }
    if (playerStats.passInterceptions) {
      points += playerStats.passInterceptions * FANTASY_SCORING_RULES.passInterceptions;
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
      points += playerStats.receptions * FANTASY_SCORING_RULES.pointsPerReception;
    }
    if (playerStats.receivingYards) {
      points += playerStats.receivingYards * FANTASY_SCORING_RULES.receivingYards;
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
      points += playerStats.totalTackles * FANTASY_SCORING_RULES.idpTotalTackles;
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
      points += playerStats.passDeflections * FANTASY_SCORING_RULES.idpPassDeflections;
    }
    if (playerStats.fumblesRecovered) {
      points += playerStats.fumblesRecovered * FANTASY_SCORING_RULES.idpFumblesRecovered;
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
  static determineWinner(homeScore: number, awayScore: number, homeTeam: string, awayTeam: string): string {
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
  static findTopTouchdownScorer(playerStats: PlayerStats[]): { playerID: string; playerName: string; touchdowns: number } | null {
    let topScorer = null;
    let maxTouchdowns = 0;

    for (const player of playerStats) {
      const totalTDs = (player.passTD || 0) + (player.rushTD || 0) + (player.receivingTD || 0);
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
    if (userPick.lockOfWeek && (userPick.lockOfWeek === gameResult.homeTeam || userPick.lockOfWeek === gameResult.awayTeam)) {
      const selectedTeam = userPick.lockOfWeek;
      const isCorrect = selectedTeam === winner;
      const points = isCorrect ? 2 : 0; // 2 points for correct lock pick
      
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
      const isCorrect = topScorer && topScorer.playerID === userPick.touchdownScorer;
      const points = isCorrect ? 3 : 0; // 3 points for correct TD scorer
      
      pickResults.touchdownScorer = {
        selectedPlayer: userPick.touchdownScorer,
        selectedPlayerName: userPick.touchdownScorerName || "Unknown Player",
        actualScorer: topScorer?.playerID || "",
        actualScorerName: topScorer?.playerName || "No TD Scorer",
        isCorrect,
        points,
      };
      totalPoints += points;
    }

    // Evaluate prop bet (if specified)
    if (userPick.propBet) {
      // For now, prop bets are manually evaluated - this could be enhanced with more complex logic
      const isCorrect = false; // Placeholder - would need specific prop bet evaluation logic
      const points = isCorrect ? 5 : 0; // 5 points for correct prop bet
      
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
        p => p.playerID === userPick.touchdownScorer
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