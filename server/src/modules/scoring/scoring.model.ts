import mongoose, { Schema, type Document } from "mongoose";

export interface IScoring extends Document {
  user: mongoose.Types.ObjectId;
  gameID: string;
  week: number;
  season: number;
  // Pick evaluation results
  pickCorrect: boolean;
  pointsEarned: number;
  // Detailed breakdown
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
  // Fantasy points earned
  fantasyPoints: number;
  // Game context
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  winner: string;
  gameStatus: string;
  isFinal: boolean;
  // Metadata
  evaluatedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const ScoringSchema = new Schema<IScoring>(
  {
    user: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true, 
      index: true 
    },
    gameID: { 
      type: String, 
      required: true, 
      index: true 
    },
    week: { 
      type: Number, 
      required: true, 
      index: true 
    },
    season: { 
      type: Number, 
      required: true, 
      index: true 
    },
    pickCorrect: { 
      type: Boolean, 
      required: true, 
      default: false 
    },
    pointsEarned: { 
      type: Number, 
      required: true, 
      default: 0 
    },
    spreadPick: {
      selectedTeam: { type: String },
      actualWinner: { type: String },
      isCorrect: { type: Boolean, default: false },
      points: { type: Number, default: 0 },
    },
    lockPick: {
      selectedTeam: { type: String },
      actualWinner: { type: String },
      isCorrect: { type: Boolean, default: false },
      points: { type: Number, default: 0 },
    },
    touchdownScorer: {
      selectedPlayer: { type: String },
      selectedPlayerName: { type: String },
      actualScorer: { type: String },
      actualScorerName: { type: String },
      isCorrect: { type: Boolean, default: false },
      points: { type: Number, default: 0 },
    },
    propBet: {
      description: { type: String },
      isCorrect: { type: Boolean, default: false },
      points: { type: Number, default: 0 },
    },
    fantasyPoints: { 
      type: Number, 
      default: 0 
    },
    homeTeam: { 
      type: String, 
      required: true 
    },
    awayTeam: { 
      type: String, 
      required: true 
    },
    homeScore: { 
      type: Number, 
      required: true 
    },
    awayScore: { 
      type: Number, 
      required: true 
    },
    winner: { 
      type: String, 
      required: true 
    },
    gameStatus: { 
      type: String, 
      required: true 
    },
    isFinal: { 
      type: Boolean, 
      default: false 
    },
    evaluatedAt: { 
      type: Date, 
      required: true, 
      default: Date.now 
    },
  },
  { 
    timestamps: true, 
    collection: "scoring" 
  }
);

// Compound indexes for efficient querying
ScoringSchema.index({ user: 1, week: 1 });
ScoringSchema.index({ user: 1, season: 1 });
ScoringSchema.index({ gameID: 1, week: 1 });
ScoringSchema.index({ week: 1, season: 1 });
ScoringSchema.index({ isFinal: 1 });

// Ensure one scoring record per user per game
ScoringSchema.index({ user: 1, gameID: 1 }, { unique: true });

export const Scoring = mongoose.model<IScoring>("Scoring", ScoringSchema);
export default Scoring;
