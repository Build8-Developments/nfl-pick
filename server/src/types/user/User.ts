import type { ObjectId } from "mongoose";

export interface IUser {
  _id: ObjectId;
  username: string; // Unique login username
  email?: string; // Unique email
  passwordHash: string; // Bcrypt hashed password
  avatar: string;
  role: "admin" | "user"; // Role-based access

  // Points system
  points: number; // Current total points
  totalBets: number; // Lifetime bet count
  correctBets: number; // Lifetime correct bets
  winRate: number; // Calculated field

  // Bet references
  bets: ObjectId[]; // Array of bet IDs
  props: ObjectId[]; // Array of prop IDs (Prop O.T.W)

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
