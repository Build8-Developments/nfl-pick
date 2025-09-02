import mongoose from "mongoose";

const bettingOddsSchema = new mongoose.Schema({
  gameId: {
    type: String,
  },
  awayTeam: {
    type: String,
  },
  homeTeam: {
    type: String,
  },
  last_updated_e_time: {
    type: String,
  },
  gameDate: {
    type: String,
  },
  teamIDHome: {
    type: String,
  },
  teamIDAway: {
    type: String,
  },
});
