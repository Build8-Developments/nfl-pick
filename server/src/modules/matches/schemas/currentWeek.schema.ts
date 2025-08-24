// server/src/modules/matches/schemas/currentWeek.schema.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ICurrentWeek extends Document {
  srId: string;
  seasonId: mongoose.Types.ObjectId;
  sequence: number;
  title: string;
  games: mongoose.Types.ObjectId[];
  status: "upcoming" | "active" | "closed" | "finished";
  bettingOpen: Date;
  bettingClose: Date;
  startDate: Date;
  endDate: Date;
  isCurrentWeek: boolean;
  lastUpdated: Date;
  totalGames: number;
  completedGames: number;
}

const CurrentWeekSchema = new Schema<ICurrentWeek>(
  {
    srId: {
      type: String,
      required: true,
      unique: true,
    },
    seasonId: {
      type: Schema.Types.ObjectId,
      ref: "Season",
      required: true,
    },
    sequence: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    games: [
      {
        type: Schema.Types.ObjectId,
        ref: "Game",
      },
    ],
    status: {
      type: String,
      enum: ["upcoming", "active", "closed", "finished"],
      default: "upcoming",
    },
    bettingOpen: {
      type: Date,
      required: true,
    },
    bettingClose: {
      type: Date,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isCurrentWeek: {
      type: Boolean,
      default: false,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    totalGames: {
      type: Number,
      default: 0,
    },
    completedGames: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: "currentWeeks",
  }
);

// Indexes
CurrentWeekSchema.index({ srId: 1 });
CurrentWeekSchema.index({ isCurrentWeek: 1 });
CurrentWeekSchema.index({ seasonId: 1 });

export const CurrentWeek = mongoose.model<ICurrentWeek>(
  "CurrentWeek",
  CurrentWeekSchema
);
