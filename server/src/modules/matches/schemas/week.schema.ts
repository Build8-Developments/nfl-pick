import mongoose, { Schema, Document } from "mongoose";

export interface IWeek extends Document {
  srId: string;
  seasonId: mongoose.Types.ObjectId;
  sequence: number;
  title: string;
  games: mongoose.Types.ObjectId[];
  status: "upcoming" | "active" | "closed" | "finished";
  startDate: Date;
  endDate: Date;
  lastUpdated: Date;
}

const WeekSchema = new Schema<IWeek>(
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
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "weeks",
  }
);

// Indexes
WeekSchema.index({ srId: 1 });
WeekSchema.index({ seasonId: 1, sequence: 1 });
WeekSchema.index({ status: 1 });

export const Week = mongoose.model<IWeek>("Week", WeekSchema);
