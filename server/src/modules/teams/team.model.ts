import mongoose, { Document } from "mongoose";

export interface ITeam extends Document {
  teamAbv: string;
  teamCity: string;
  teamName: string;
  nflComLogo1: string;
  teamID: string;
  espnLogo1: string;
}

const teamSchema = new mongoose.Schema(
  {
    teamAbv: {
      type: String,
    },
    teamCity: {
      type: String,
    },
    teamName: {
      type: String,
    },
    nflComLogo1: {
      type: String,
    },
    teamID: {
      type: String,
    },
    espnLogo1: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: "teams",
  }
);

const Team = mongoose.model<ITeam>("Team", teamSchema);

export default Team;
