import mongoose from "mongoose";

export interface IGame {
  gameID: string;
  seasonType: string;
  away: string;
  gameDate: string;
  espnID: string;
  teamIDHome: string;
  gameStatus: string;
  gameWeek: string;
  teamIDAway: string;
  home: string;
  espnLink: string;
  cbsLink: string;
  gameTime: string;
  gameTimeEpoch: string;
  season: string;
  neutralSite: string;
  gameStatusCode: string;
}

const gameSchema = new mongoose.Schema(
  {
    gameID: {
      type: String,
      index: true,
      unique: true,
    },
    seasonType: {
      type: String,
    },
    away: {
      type: String,
    },
    gameDate: {
      type: String,
    },
    espnID: {
      type: String,
    },
    teamIDHome: {
      type: String,
    },
    gameStatus: {
      type: String,
    },
    gameWeek: {
      type: String,
    },
    teamIDAway: {
      type: String,
    },
    home: {
      type: String,
    },
    espnLink: {
      type: String,
    },
    cbsLink: {
      type: String,
    },
    gameTime: {
      type: String,
    },
    gameTimeEpoch: {
      type: String,
    },
    season: {
      type: String,
    },
    neutralSite: {
      type: String,
    },
    gameStatusCode: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: "games",
  }
);

const Game = mongoose.model<IGame>("Game", gameSchema);

export default Game;
