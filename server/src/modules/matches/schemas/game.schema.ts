// server/src/modules/matches/schemas/game.schema.ts
import mongoose, { Schema, Document } from "mongoose";
import type { ITeam } from "./team.schema.js";
import type { IGamePeriod, IGamePlay } from "../../../types/matches/Game.js";

export interface IGame extends Document {
  srId: string;
  title?: string;
  gameType: string;
  conferenceGame: boolean;
  neutralSite: boolean;
  status: "scheduled" | "live" | "closed" | "cancelled";
  clock: string;
  quarter: number;
  scheduled: Date;
  duration: string;
  homeTeam: ITeam;
  awayTeam: ITeam;
  scoring: IGamePeriod[];
  scoringPlays: IGamePlay[];
  attendance: number;
  entryMode: string;
  seasonId: mongoose.Types.ObjectId;
  weekId: mongoose.Types.ObjectId;
  isBettingOpen: boolean;
}

// Sub-schemas
const GameTeamSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  market: { type: String, required: true },
  alias: { type: String, required: true },
  srId: { type: String, required: true },
  points: { type: Number, default: 0 },
  usedTimeouts: { type: Number, default: 0 },
  remainingTimeouts: { type: Number, default: 3 },
  usedChallenges: { type: Number, default: 0 },
  remainingChallenges: { type: Number, default: 2 },
  record: {
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    ties: { type: Number, default: 0 },
  },
});

const GamePeriodSchema = new Schema({
  periodType: { type: String, required: true },
  number: { type: Number, required: true },
  sequence: { type: Number, required: true },
  homePoints: { type: Number, default: 0 },
  awayPoints: { type: Number, default: 0 },
});

const GamePlaySchema = new Schema({
  id: { type: String, required: true },
  sequence: { type: Number, required: true },
  clock: { type: String, required: true },
  homePoints: { type: Number, default: 0 },
  awayPoints: { type: Number, default: 0 },
  playType: { type: String, required: true },
  scoringPlay: { type: Boolean, default: false },
  description: { type: String, required: true },
  scoringDescription: { type: String, required: true },
  player: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    jersey: { type: String, required: true },
    position: { type: String, required: true },
    srId: { type: String, required: true },
  },
  team: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    market: { type: String, required: true },
    alias: { type: String, required: true },
    srId: { type: String, required: true },
  },
  statistics: [{ type: Schema.Types.Mixed }],
});

const GameSchema = new Schema<IGame>(
  {
    srId: {
      type: String,
      required: true,
      unique: true,
    },
    title: { type: String },
    gameType: {
      type: String,
      required: true,
    },
    conferenceGame: {
      type: Boolean,
      default: false,
    },
    neutralSite: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["scheduled", "live", "closed", "cancelled"],
      default: "scheduled",
    },
    clock: {
      type: String,
      default: "00:00",
    },
    quarter: {
      type: Number,
      default: 1,
    },
    scheduled: {
      type: Date,
      required: true,
    },
    duration: {
      type: String,
      default: "00:00",
    },
    homeTeam: {
      type: GameTeamSchema,
      required: true,
    },
    awayTeam: {
      type: GameTeamSchema,
      required: true,
    },
    scoring: [GamePeriodSchema],
    scoringPlays: [GamePlaySchema],
    attendance: {
      type: Number,
      default: 0,
    },
    entryMode: {
      type: String,
      required: true,
    },
    seasonId: {
      type: Schema.Types.ObjectId,
      ref: "Season",
      required: true,
    },
    weekId: {
      type: Schema.Types.ObjectId,
      ref: "Week",
      required: true,
    },
    isBettingOpen: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "games",
  }
);

// Indexes
GameSchema.index({ srId: 1 });
GameSchema.index({ weekId: 1, status: 1 });
GameSchema.index({ scheduled: 1 });
GameSchema.index({ seasonId: 1 });

export const Game = mongoose.model<IGame>("Game", GameSchema);
