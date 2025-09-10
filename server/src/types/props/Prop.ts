import type { ObjectId } from "mongoose";

export interface IProp {
  _id: ObjectId;

  // User who submitted the prop
  userId: ObjectId; // Reference to IUser

  // Week context
  weekId: ObjectId; // Reference to IWeek
  seasonId: ObjectId; // Reference to ISeason

  // Prop details
  prediction: string; // User's weekly prediction (free text)
  category?: string; // Optional category (e.g., "Player Performance", "Team Stats")

  // Status and evaluation
  status: "pending" | "correct" | "incorrect";

  // Admin evaluation
  evaluatedBy?: ObjectId; // Admin who evaluated it
  evaluatedAt?: Date; // When it was evaluated
  adminNotes?: string; // Admin's notes on evaluation

  // Points (free to submit, +1 if correct)
  pointsWon: number; // 1 if correct, 0 if incorrect

  // Timing
  submittedAt: Date; // When prop was submitted
  weekEndDate: Date; // When week ends (for admin evaluation)

  createdAt: Date;
  updatedAt: Date;
}
