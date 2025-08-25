import type { ObjectId } from "mongoose";

export interface ISeason {
  _id: ObjectId;
  srId: string; // Sports Radar ID
  year: number; // 2025
  type: string; // "PRE", "REG", "POST"
  name: string; // "PRE", "Regular Season", "Playoffs"
  isActive: boolean; // Current active season
  createdAt: Date; // Record creation time
  updatedAt: Date; // Last update time
}
