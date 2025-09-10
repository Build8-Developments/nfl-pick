import type { ObjectId } from "mongoose";

export interface IGame {
  _id: ObjectId;
  srId: string; // "ca9d8f84-8e7b-4ee7-a310-54c2e3ca4edc"

  // Basic game info
  title?: string; // "Super Bowl LIX"
  gameType: string; // "playoff", "regular", "preseason"
  conferenceGame: boolean; // false
  neutralSite: boolean; // true (for Super Bowl)

  // Game status
  status: "scheduled" | "live" | "closed" | "cancelled";
  clock: string; // "00:00" (current game time)
  quarter: number; // 4 (current quarter)

  // Scheduling
  scheduled: Date; // "2025-02-09T23:30:00+00:00"
  duration: string; // "3:36" (game duration)

  // Teams
  homeTeam: IGameTeam; // Home team with stats
  awayTeam: IGameTeam; // Away team with stats

  // Scoring
  scoring: IGamePeriod[]; // Quarter-by-quarter scores
  scoringPlays: IGamePlay[]; // Detailed scoring plays

  // Game metadata
  attendance: number; // 65719
  entryMode: string; // "LDE"

  // References
  seasonId: ObjectId; // Reference to Season
  weekId: ObjectId; // Reference to Week

  // Betting
  isBettingOpen: boolean; // Can users still bet?

  createdAt: Date;
  updatedAt: Date;
}

// Team information within the game
export interface IGameTeam {
  id: string; // Team ID from Sports Radar
  name: string; // "Eagles", "Chiefs"
  market: string; // "Philadelphia", "Kansas City"
  alias: string; // "PHI", "KC"
  srId: string; // Sports Radar team ID

  // Game stats
  points: number; // Final score (40, 22)
  usedTimeouts: number; // 2, 3
  remainingTimeouts: number; // 1, 0
  usedChallenges: number; // 0
  remainingChallenges: number; // 2

  // Season record
  record: {
    wins: number; // 14, 15
    losses: number; // 3, 2
    ties: number; // 0
  };
}

// Quarter scoring
export interface IGamePeriod {
  periodType: string; // "quarter"
  number: number; // 1, 2, 3, 4
  sequence: number; // 1, 2, 3, 4
  homePoints: number; // 7, 17, 10, 6
  awayPoints: number; // 0, 0, 6, 16
}

// Scoring play details
export interface IGamePlay {
  id: string; // Play ID
  sequence: number; // Sequence number
  clock: string; // "6:18" (time in quarter)
  homePoints: number; // Points after play
  awayPoints: number; // Points after play

  // Play details
  playType: string; // "rush", "pass", "field_goal"
  scoringPlay: boolean; // true
  description: string; // "J.Hurts rushed up the middle for 1 yards. TOUCHDOWN."
  scoringDescription: string; // Same as description for scoring plays

  // Player who scored
  player: {
    id: string; // Player ID
    name: string; // "Jalen Hurts"
    jersey: string; // "01"
    position: string; // "QB"
    srId: string; // Sports Radar player ID
  };

  // Team that scored
  team: {
    id: string; // Team ID
    name: string; // "Eagles"
    market: string; // "Philadelphia"
    alias: string; // "PHI"
    srId: string; // Sports Radar team ID
  };

  // Statistics for the play
  statistics: IGameStat[];

  createdAt: Date;
  updatedAt: Date;
}

// Game statistics
export interface IGameStat {
  statType: string; // "rush", "first_down"
  attempt?: number; // 1 (for rush)
  yards?: number; // 1 (for rush)
  touchdown?: number; // 1 (for TD)
  firstdown?: number; // 1 (for first down)

  // Player and team info
  player: {
    id: string;
    name: string;
    jersey: string;
    position: string;
    srId: string;
  };

  team: {
    id: string;
    name: string;
    market: string;
    alias: string;
    srId: string;
  };
}
