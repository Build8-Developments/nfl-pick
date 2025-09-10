import type { ObjectId } from "mongoose";

export interface IWeek {
  _id: ObjectId;
  srId: string; // Week ID from Sports Radar
  seasonId: ObjectId; // Reference to Season
  sequence: number; // Week number
  title: string; // Week title

  // Games for this week
  games: ObjectId[]; // Array of Game IDs

  // Week status
  status: "upcoming" | "active" | "closed" | "finished";

  // Week boundaries
  startDate: Date; // First game date
  endDate: Date; // Last game date

  // Sync info
  lastUpdated: Date;

  createdAt: Date;
  updatedAt: Date;
}
