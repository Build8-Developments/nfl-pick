import mongoose, { Schema, type Document } from "mongoose";

export interface IPick extends Document {
  user: mongoose.Types.ObjectId;
  week: number;
  selections: Record<string, string>; // gameId -> teamAbv
  lockOfWeek?: string; // teamAbv
  touchdownScorer?: string; // playerId
  propBet?: string;
  propBetOdds?: string;
  isFinalized?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const PickSchema = new Schema<IPick>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    week: { type: Number, required: true, index: true },
    selections: { type: Schema.Types.Mixed, default: {} },
    lockOfWeek: { type: String },
    touchdownScorer: { type: String },
    propBet: { type: String },
    propBetOdds: { type: String },
    isFinalized: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "picks" }
);

PickSchema.index({ user: 1, week: 1 }, { unique: true });

export const Pick = mongoose.model<IPick>("Pick", PickSchema);
export default Pick;


