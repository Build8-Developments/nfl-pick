import type { ObjectId } from "mongoose";

export interface ICurrentWeek {
  _id: ObjectId;
  srId: string; // "e50522f9-d978-4304-a930-226fa6a24139"
  seasonId: ObjectId; // Reference to Season
  sequence: number; // 3 (week number)
  title: string; // "3" (week title)

  // Games array - maps directly to API games property
  games: ObjectId[]; // Array of Game IDs

  // Week status for betting system
  status: "upcoming" | "active" | "closed" | "finished";

  // Betting windows (calculated fields)
  bettingOpen: Date; // When betting opens for this week
  bettingClose: Date; // When betting closes for this week

  // Week boundaries (calculated from games)
  startDate: Date; // Earliest game date in the week
  endDate: Date; // Latest game date in the week

  // Real-time tracking
  isCurrentWeek: boolean; // Is this the current active week?
  lastUpdated: Date; // Last sync from Sports Radar API

  // Week metadata
  totalGames: number; // Count of games in this week
  completedGames: number; // Count of finished games

  createdAt: Date;
  updatedAt: Date;
}
