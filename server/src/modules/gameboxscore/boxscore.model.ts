import mongoose from "mongoose";

export interface BoxscoreDocument extends mongoose.Document {
  gameId: string;
  gameStatus: string;
  away: {
    teamId: string;
    teamAvbr: string;
    points: number;
    result: string;
  };
  home: {
    teamId: string;
    teamAvbr: string;
    points: number;
    result: string;
  };
  gameWeek: number;
  scoringPlays: {
    teamID: string;
    scoreType: string;
    team: string;
    playerIDs: string[];
  }[];
}

const BoxscoreSchema = new mongoose.Schema(
  {
    gameId: { type: String, required: true, unique: true },
    gameStatus: { type: String, required: true },
    away: {
      teamId: { type: String, required: true },
      teamAvbr: { type: String, required: true },
      points: { type: Number, required: true },
      result: { type: String, required: true },
    },
    home: {
      teamId: { type: String, required: true },
      teamAvbr: { type: String, required: true },
      points: { type: Number, required: true },
      result: { type: String, required: true },
    },
    gameWeek: { type: Number, required: true },
    scoringPlays: [
      {
        teamID: { type: String, required: true },
        scoreType: { type: String, required: true },
        team: { type: String, required: true },
        playerIDs: [{ type: String, required: true }],
      },
    ],
  },
  { timestamps: true }
);

export const GameBoxscore = mongoose.model<BoxscoreDocument>(
  "Boxscore",
  BoxscoreSchema
);
