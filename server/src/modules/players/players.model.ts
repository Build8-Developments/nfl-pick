import mongoose, { Document } from "mongoose";

export interface IPlayer extends Document {
  espnId: string;
  espnName: string;
  espnIDFull: string;
  jerseyNum: string;
  cbsShortName: string;
  team: string;
  espnHeadshot: string;
  cbsLongName: string;
  teamID: string;
  pos: string;
  cbsPlayerID: string;
  longName: string;
  playerID: string;
}

const playerSchema = new mongoose.Schema(
  {
    espnId: {
      type: String,
    },
    espnName: {
      type: String,
    },
    espnIDFull: {
      type: String,
    },
    jerseyNum: {
      type: String,
    },
    cbsShortName: {
      type: String,
    },
    team: {
      type: String,
    },
    espnHeadshot: {
      type: String,
    },
    cbsLongName: {
      type: String,
    },
    teamID: {
      type: String,
    },
    pos: {
      type: String,
    },
    cbsPlayerID: {
      type: String,
    },
    longName: {
      type: String,
    },
    playerID: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: "players",
  }
);

const Player = mongoose.model<IPlayer>("Player", playerSchema);

export default Player;
