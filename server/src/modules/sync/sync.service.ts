import { getNFLGamesForWeek } from "../../api/nfl.js";
import type { IGame } from "../games/games.model.js";
import { insertGames } from "../games/games.service.js";

const getCurrentSeason = () => {
  const now = new Date();
  // NFL season mostly spans Sep-Feb, use year of September for season label
  return now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
};

const getSeasonStartDate = (season: number) => {
  // Approximate regular season start: first Thursday after Sep 1st
  const septemberFirst = new Date(season, 8, 1);
  // Find first Thursday (4) on/after Sep 1
  const day = septemberFirst.getDay();
  const diff = (4 - day + 7) % 7; // 4 = Thursday
  const firstThursday = new Date(septemberFirst);
  firstThursday.setDate(septemberFirst.getDate() + diff);
  return firstThursday;
};

const computeCurrentWeek = (season: number) => {
  const start = getSeasonStartDate(season);
  const now = new Date();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const diffWeeks = Math.floor((now.getTime() - start.getTime()) / msPerWeek);
  // Week indexing starts at 1; clamp between 1 and 18 for regular season
  return Math.min(Math.max(diffWeeks + 1, 1), 18);
};

const syncWeekGames = async (week?: number, season?: number) => {
  try {
    const targetSeason = season ?? getCurrentSeason();
    const targetWeek = week ?? computeCurrentWeek(targetSeason);
    const games = await getNFLGamesForWeek(targetWeek, targetSeason);

    // Normalize incoming API payload to our IGame shape defensively
    const normalizeString = (value: unknown) =>
      value === undefined || value === null ? "" : String(value);

    const toIGame = (raw: any): IGame => ({
      gameID: normalizeString(raw.gameID ?? raw.gameId ?? raw.GameID),
      seasonType: normalizeString(raw.seasonType ?? raw.SeasonType),
      away: normalizeString(
        raw.away ?? raw.Away ?? raw.awayTeam ?? raw.AwayTeam
      ),
      gameDate: normalizeString(raw.gameDate ?? raw.GameDate),
      espnID: normalizeString(raw.espnID ?? raw.espnId ?? raw.ESPNID),
      teamIDHome: normalizeString(
        raw.teamIDHome ?? raw.teamIdHome ?? raw.TeamIDHome
      ),
      gameStatus: normalizeString(raw.gameStatus ?? raw.GameStatus),
      gameWeek: normalizeString(raw.gameWeek ?? raw.week ?? raw.Week),
      teamIDAway: normalizeString(
        raw.teamIDAway ?? raw.teamIdAway ?? raw.TeamIDAway
      ),
      home: normalizeString(
        raw.home ?? raw.Home ?? raw.homeTeam ?? raw.HomeTeam
      ),
      espnLink: normalizeString(raw.espnLink ?? raw.ESPNLink),
      cbsLink: normalizeString(raw.cbsLink ?? raw.CBSLink),
      gameTime: normalizeString(raw.gameTime ?? raw.GameTime),
      gameTimeEpoch: normalizeString(raw.gameTimeEpoch ?? raw.GameTimeEpoch),
      season: normalizeString(raw.season ?? raw.Season ?? targetSeason),
      neutralSite: normalizeString(raw.neutralSite ?? raw.NeutralSite),
      gameStatusCode: normalizeString(raw.gameStatusCode ?? raw.GameStatusCode),
    });

    const rawGames = Array.isArray(games?.body) ? games.body : [];
    const mappedGames: IGame[] = rawGames
      .map(toIGame)
      .filter((g: IGame) => !!g.gameID);

    // Basic debug record to verify mapping
    if (mappedGames[0]) {
      console.log(
        "[Sync] First mapped game keys:",
        Object.keys(mappedGames[0] as any)
      );
      console.log("[Sync] First mapped gameID:", mappedGames[0].gameID);
    }

    const newGames =
      mappedGames.length > 0
        ? await insertGames(mappedGames)
        : ({
            insertedCount: 0,
            matchedCount: 0,
            modifiedCount: 0,
            deletedCount: 0,
            upsertedCount: 0,
            upsertedIds: {},
            insertedIds: {},
          } as any);

    return {
      result: newGames,
      week: targetWeek,
      season: targetSeason,
      stats: {
        received: rawGames.length,
        mapped: mappedGames.length,
        skippedMissingGameID: rawGames.length - mappedGames.length,
      },
    };
  } catch (error) {
    throw new Error("Failed to sync week games");
  }
};

export { syncWeekGames };

// Sync all weeks for a season (1-18)
export const syncSeasonGames = async (season?: number) => {
  const targetSeason = season ?? getCurrentSeason();
  let totalReceived = 0;
  let totalMapped = 0;
  let totalUpserts = 0;

  for (let w = 1; w <= 18; w++) {
    const { stats, result } = await syncWeekGames(w, targetSeason);
    totalReceived += stats?.received ?? 0;
    totalMapped += stats?.mapped ?? 0;
    totalUpserts += (result?.upsertedCount ?? 0) + (result?.matchedCount ?? 0);
  }

  return {
    message: "Season sync completed",
    season: targetSeason,
    totals: {
      received: totalReceived,
      mapped: totalMapped,
      upsertsOrMatches: totalUpserts,
    },
  };
};
