import mongoose, { Schema, type Document } from "mongoose";

export interface IGameResult extends Document {
  gameID: string;
  season: number;
  week: number;
  homeTeam: string;
  awayTeam: string;
  teamIDHome: string;
  teamIDAway: string;
  homeScore: number;
  awayScore: number;
  winner: string; // teamAbv of winning team
  gameStatus: string;
  quarter: number;
  timeRemaining: string;
  lastUpdated: string;
  isFinal: boolean;
  homeTeamStats: {
    totalYards: number;
    passingYards: number;
    rushingYards: number;
    turnovers: number;
    penalties: number;
    timeOfPossession: string;
    firstDowns: number;
    thirdDownConversions: number;
    thirdDownAttempts: number;
    fourthDownConversions: number;
    fourthDownAttempts: number;
    redZoneAttempts: number;
    redZoneScores: number;
  };
  awayTeamStats: {
    totalYards: number;
    passingYards: number;
    rushingYards: number;
    turnovers: number;
    penalties: number;
    timeOfPossession: string;
    firstDowns: number;
    thirdDownConversions: number;
    thirdDownAttempts: number;
    fourthDownConversions: number;
    fourthDownAttempts: number;
    redZoneAttempts: number;
    redZoneScores: number;
  };
  playerStats: Array<{
    playerID: string;
    playerName: string;
    position: string;
    teamID: string;
    teamAbv: string;
    // Passing stats
    passAttempts?: number;
    passCompletions?: number;
    passYards?: number;
    passTD?: number;
    passInterceptions?: number;
    // Rushing stats
    carries?: number;
    rushYards?: number;
    rushTD?: number;
    fumbles?: number;
    // Receiving stats
    receptions?: number;
    receivingYards?: number;
    receivingTD?: number;
    targets?: number;
    // Kicking stats
    fgMade?: number;
    fgMissed?: number;
    xpMade?: number;
    xpMissed?: number;
    // Defense stats
    totalTackles?: number;
    soloTackles?: number;
    tacklesForLoss?: number;
    qbHits?: number;
    interceptions?: number;
    sacks?: number;
    passDeflections?: number;
    fumblesRecovered?: number;
    // Fantasy points
    fantasyPoints?: number;
  }>;
  playByPlay?: Array<{
    playID: string;
    quarter: number;
    time: string;
    down: number;
    distance: number;
    yardLine: string;
    description: string;
    homeScore: number;
    awayScore: number;
    playType: string;
    playerID?: string;
    playerName?: string;
  }>;
  fantasyPoints?: {
    homeTeamTotal: number;
    awayTeamTotal: number;
    homeTeamPlayers: Record<string, number>;
    awayTeamPlayers: Record<string, number>;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const GameResultSchema = new Schema<IGameResult>(
  {
    gameID: { 
      type: String, 
      required: true, 
      unique: true, 
      index: true 
    },
    season: { 
      type: Number, 
      required: true, 
      index: true 
    },
    week: { 
      type: Number, 
      required: true, 
      index: true 
    },
    homeTeam: { 
      type: String, 
      required: true 
    },
    awayTeam: { 
      type: String, 
      required: true 
    },
    teamIDHome: { 
      type: String, 
      required: true 
    },
    teamIDAway: { 
      type: String, 
      required: true 
    },
    homeScore: { 
      type: Number, 
      required: true, 
      default: 0 
    },
    awayScore: { 
      type: Number, 
      required: true, 
      default: 0 
    },
    winner: { 
      type: String, 
      required: true 
    },
    gameStatus: { 
      type: String, 
      required: true 
    },
    quarter: { 
      type: Number, 
      default: 1 
    },
    timeRemaining: { 
      type: String, 
      default: "15:00" 
    },
    lastUpdated: { 
      type: String, 
      required: true 
    },
    isFinal: { 
      type: Boolean, 
      default: false, 
      index: true 
    },
    homeTeamStats: {
      totalYards: { type: Number, default: 0 },
      passingYards: { type: Number, default: 0 },
      rushingYards: { type: Number, default: 0 },
      turnovers: { type: Number, default: 0 },
      penalties: { type: Number, default: 0 },
      timeOfPossession: { type: String, default: "00:00" },
      firstDowns: { type: Number, default: 0 },
      thirdDownConversions: { type: Number, default: 0 },
      thirdDownAttempts: { type: Number, default: 0 },
      fourthDownConversions: { type: Number, default: 0 },
      fourthDownAttempts: { type: Number, default: 0 },
      redZoneAttempts: { type: Number, default: 0 },
      redZoneScores: { type: Number, default: 0 },
    },
    awayTeamStats: {
      totalYards: { type: Number, default: 0 },
      passingYards: { type: Number, default: 0 },
      rushingYards: { type: Number, default: 0 },
      turnovers: { type: Number, default: 0 },
      penalties: { type: Number, default: 0 },
      timeOfPossession: { type: String, default: "00:00" },
      firstDowns: { type: Number, default: 0 },
      thirdDownConversions: { type: Number, default: 0 },
      thirdDownAttempts: { type: Number, default: 0 },
      fourthDownConversions: { type: Number, default: 0 },
      fourthDownAttempts: { type: Number, default: 0 },
      redZoneAttempts: { type: Number, default: 0 },
      redZoneScores: { type: Number, default: 0 },
    },
    playerStats: [{
      playerID: { type: String, required: true },
      playerName: { type: String, required: true },
      position: { type: String, required: true },
      teamID: { type: String, required: true },
      teamAbv: { type: String, required: true },
      // Passing stats
      passAttempts: { type: Number, default: 0 },
      passCompletions: { type: Number, default: 0 },
      passYards: { type: Number, default: 0 },
      passTD: { type: Number, default: 0 },
      passInterceptions: { type: Number, default: 0 },
      // Rushing stats
      carries: { type: Number, default: 0 },
      rushYards: { type: Number, default: 0 },
      rushTD: { type: Number, default: 0 },
      fumbles: { type: Number, default: 0 },
      // Receiving stats
      receptions: { type: Number, default: 0 },
      receivingYards: { type: Number, default: 0 },
      receivingTD: { type: Number, default: 0 },
      targets: { type: Number, default: 0 },
      // Kicking stats
      fgMade: { type: Number, default: 0 },
      fgMissed: { type: Number, default: 0 },
      xpMade: { type: Number, default: 0 },
      xpMissed: { type: Number, default: 0 },
      // Defense stats
      totalTackles: { type: Number, default: 0 },
      soloTackles: { type: Number, default: 0 },
      tacklesForLoss: { type: Number, default: 0 },
      qbHits: { type: Number, default: 0 },
      interceptions: { type: Number, default: 0 },
      sacks: { type: Number, default: 0 },
      passDeflections: { type: Number, default: 0 },
      fumblesRecovered: { type: Number, default: 0 },
      // Fantasy points
      fantasyPoints: { type: Number, default: 0 },
    }],
    playByPlay: [{
      playID: { type: String, required: true },
      quarter: { type: Number, required: true },
      time: { type: String, required: true },
      down: { type: Number, default: 1 },
      distance: { type: Number, default: 10 },
      yardLine: { type: String, default: "50" },
      description: { type: String, required: true },
      homeScore: { type: Number, default: 0 },
      awayScore: { type: Number, default: 0 },
      playType: { type: String, default: "unknown" },
      playerID: { type: String },
      playerName: { type: String },
    }],
    fantasyPoints: {
      homeTeamTotal: { type: Number, default: 0 },
      awayTeamTotal: { type: Number, default: 0 },
      homeTeamPlayers: { type: Schema.Types.Mixed, default: {} },
      awayTeamPlayers: { type: Schema.Types.Mixed, default: {} },
    },
  },
  { 
    timestamps: true, 
    collection: "gameResults" 
  }
);

// Indexes for efficient querying
GameResultSchema.index({ gameID: 1 });
GameResultSchema.index({ season: 1, week: 1 });
GameResultSchema.index({ isFinal: 1 });
GameResultSchema.index({ lastUpdated: 1 });

export const GameResult = mongoose.model<IGameResult>("GameResult", GameResultSchema);
export default GameResult;
