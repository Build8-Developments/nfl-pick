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
  outcomes?: Record<string, boolean | null>; // gameId -> isCorrect
  status?: string; // e.g., PENDING, SETTLED
  propBetResolved?: boolean;
  propBetCorrect?: boolean;
  propBetStatus?: 'pending' | 'approved' | 'rejected'; // New approval status
  propBetApprovedAt?: Date; // When it was approved/rejected
  propBetApprovedBy?: mongoose.Types.ObjectId; // Who approved/rejected it
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
    outcomes: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, default: "PENDING" },
    propBetResolved: { type: Boolean, default: false },
    propBetCorrect: { type: Boolean, default: false },
    propBetStatus: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected'], 
      default: 'pending' 
    },
    propBetApprovedAt: { type: Date },
    propBetApprovedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "picks" }
);

PickSchema.index({ user: 1, week: 1 }, { unique: true });

// Ensure only one finalized pick per week can claim a specific Lock of the Week team
// Uses a partial index so drafts or empty values don't collide
PickSchema.index(
  { week: 1, lockOfWeek: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isFinalized: true,
      lockOfWeek: { $type: "string", $ne: "" },
    },
  }
);

// Ensure only one finalized pick per week can claim a specific TD scorer
PickSchema.index(
  { week: 1, touchdownScorer: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isFinalized: true,
      touchdownScorer: { $type: "string", $ne: "" },
    },
  }
);

export const Pick = mongoose.model<IPick>("Pick", PickSchema);
export default Pick;


