import type { ObjectId } from "mongoose";

export interface IBet {
  _id: ObjectId;

  // User who placed the bet
  userId: ObjectId; // Reference to IUser

  // Game and week context
  gameId: ObjectId; // Reference to IGame
  weekId: ObjectId; // Reference to IWeek
  seasonId: ObjectId; // Reference to ISeason

  // Bet type (only 4 types)
  betType: "spread" | "lock_of_week" | "td_scorer" | "prop_of_week";

  // Bet details
  prediction: string; // User's prediction
  points: number; // Points wagered (always 1 for spread, variable for others)

  // Bet status and results
  status: "pending" | "won" | "lost" | "cancelled";
  result: string; // Actual result

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
