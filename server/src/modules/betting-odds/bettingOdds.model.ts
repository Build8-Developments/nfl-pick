import mongoose, { Schema, Document } from "mongoose";

export interface IBettingOdds extends Document {
  gameID: string;
  gameDate: string;
  homeTeam: string;
  awayTeam: string;
  teamIDHome: string;
  teamIDAway: string;
  lastUpdatedETime: string;
  odds: {
    awayTeamSpread: string;
    homeTeamSpread: string;
  };
}

const bettingOddsSchema = new Schema<IBettingOdds>(
  {
    gameID: { type: String, required: true, unique: true },
    gameDate: { type: String, required: true },
    homeTeam: { type: String, required: true },
    awayTeam: { type: String, required: true },
    teamIDHome: { type: String, required: true },
    teamIDAway: { type: String, required: true },
    lastUpdatedETime: { type: String },
    odds: {
      awayTeamSpread: { type: String },
      homeTeamSpread: { type: String },
    },
  },
  {
    timestamps: true,
    collection: "betting_odds",
  }
);

const BettingOdds = mongoose.model<IBettingOdds>(
  "BettingOdds",
  bettingOddsSchema
);
export default BettingOdds;
