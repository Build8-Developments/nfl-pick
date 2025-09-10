interface IBettingOdds extends Document {
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
