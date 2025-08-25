import mongoose, { Schema, Document } from "mongoose";

export interface IBet extends Document {
  _id: mongoose.Types.ObjectId;

  // User who placed the bet
  userId: mongoose.Types.ObjectId;

  // Game and week context
  gameId: mongoose.Types.ObjectId;
  weekId: mongoose.Types.ObjectId;
  seasonId: mongoose.Types.ObjectId;

  // Bet type (only 4 types)
  betType: "spread" | "lock_of_week" | "td_scorer" | "prop_of_week";

  // Bet details
  prediction: string;
  points: number;

  // Bet status and results
  status: "pending" | "won" | "lost" | "cancelled";
  result: string;
}

const BetSchema = new Schema<IBet>(
  {
    // User who placed the bet
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },

    // Game and week context
    gameId: {
      type: Schema.Types.ObjectId,
      ref: "Game",
      required: [true, "Game ID is required"],
    },
    weekId: {
      type: Schema.Types.ObjectId,
      ref: "Week",
      required: [true, "Week ID is required"],
    },
    seasonId: {
      type: Schema.Types.ObjectId,
      ref: "Season",
      required: [true, "Season ID is required"],
    },

    // Bet type
    betType: {
      type: String,
      enum: ["spread", "lock_of_week", "td_scorer", "prop_of_week"],
      required: [true, "Bet type is required"],
    },

    // Bet details
    prediction: {
      type: String,
      required: [true, "Prediction is required"],
      trim: true,
      maxlength: [500, "Prediction cannot exceed 500 characters"],
    },
    points: {
      type: Number,
      required: [true, "Points are required"],
      min: [1, "Minimum bet is 1 point"],
      default: 1,
    },

    // Bet status and results
    status: {
      type: String,
      enum: ["pending", "won", "lost", "cancelled"],
      default: "pending",
    },
    result: {
      type: String,
      trim: true,
      maxlength: [500, "Result cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
    collection: "bets",
  }
);

// Indexes for performance
BetSchema.index({ userId: 1 });
BetSchema.index({ gameId: 1 });
BetSchema.index({ weekId: 1 });
BetSchema.index({ seasonId: 1 });
BetSchema.index({ betType: 1 });
BetSchema.index({ status: 1 });
BetSchema.index({ createdAt: 1 });

// Compound indexes for common queries
BetSchema.index({ userId: 1, weekId: 1 });
BetSchema.index({ userId: 1, status: 1 });
BetSchema.index({ weekId: 1, status: 1 });
BetSchema.index({ gameId: 1, status: 1 });

// Validation: Lock of week can only be one per user per week
BetSchema.index({ userId: 1, weekId: 1, betType: 1 }, { unique: true });

// Pre-save middleware for validation
BetSchema.pre("save", function (next) {
  // Ensure spread bets are always 1 point
  if (this.betType === "spread" && this.points !== 1) {
    this.points = 1;
  }

  next();
});

// Static method to find user's bets for a week
BetSchema.statics.findUserWeekBets = function (
  userId: mongoose.Types.ObjectId,
  weekId: mongoose.Types.ObjectId
) {
  return this.find({ userId, weekId }).populate("gameId");
};

// Static method to find pending bets for a game
BetSchema.statics.findPendingGameBets = function (
  gameId: mongoose.Types.ObjectId
) {
  return this.find({ gameId, status: "pending" }).populate("userId");
};

// Static method to find lock of the week bets for a week
BetSchema.statics.findLockOfWeekBets = function (
  weekId: mongoose.Types.ObjectId
) {
  return this.find({ weekId, betType: "lock_of_week" }).populate("userId");
};

// Method to settle bet
BetSchema.methods.settleBet = function (result: string, won: boolean) {
  this.result = result;
  this.status = won ? "won" : "lost";
  this.updatedAt = new Date();
  return this.save();
};

export const Bet = mongoose.model<IBet>("Bet", BetSchema);
