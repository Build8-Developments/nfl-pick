import { ApiResponse } from "../../utils/ApiResponse.js";
import Team, { type ITeam } from "./team.model.js";
import { getNFLTeams } from "../../api/nfl.js";

export const getAllTeamsService = async () => {
  const teams = await Team.find();
  return teams as ITeam[];
};

export const syncTeams = async () => {
  const result = await getNFLTeams();

  if (!result) {
    return ApiResponse.error("No teams found");
  }
  const newTeams = await Team.insertMany(
    result.map((team: ITeam) => ({
      teamAbv: team.teamAbv,
      teamCity: team.teamCity,
      teamName: team.teamName,
      nflComLogo1: team.nflComLogo1,
      teamID: team.teamID,
      espnLogo1: team.espnLogo1,
    }))
  );
  return newTeams;
};
