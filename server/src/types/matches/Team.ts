import type { ObjectId } from "mongoose";

export interface ITeam {
  _id: ObjectId;
  srId: string; // Team ID from Sports Radar

  name: string;
  market: string;
  alias: string;

  division: {
    id: string;
    name: string;
    alias: string;
  };

  // Team branding (from Team Profile)
  teamColors: {
    primary: string;
    secondary: string;
  };

  // Sync info
  lastUpdated: Date;

  createdAt: Date;
  updatedAt: Date;
}
