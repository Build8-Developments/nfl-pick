import mongoose, { Schema, type Document } from "mongoose";

export interface IUsedTdScorer extends Document {
  user: mongoose.Types.ObjectId;
  season: number;
  playerId: string;
  week: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const UsedTdScorerSchema = new Schema<IUsedTdScorer>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    season: { type: Number, required: true, index: true },
    playerId: { type: String, required: true, index: true },
    week: { type: Number, required: true, index: true },
  },
  { timestamps: true, collection: "usedTdScorers" }
);

// Ensure a user can only use a player once per season
UsedTdScorerSchema.index({ user: 1, season: 1, playerId: 1 }, { unique: true });

export const UsedTdScorer = mongoose.model<IUsedTdScorer>("UsedTdScorer", UsedTdScorerSchema);
export default UsedTdScorer;
