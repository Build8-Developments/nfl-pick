import { RAPIDAPI_HOST, RAPIDAPI_KEY } from "../config/environment.js";

const getCurrentSeason = () => {
  const now = new Date();
  return now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
};

const getSeasonStartDate = (season: number) => {
  const septemberFirst = new Date(season, 8, 1);
  const day = septemberFirst.getDay();
  const diff = (4 - day + 7) % 7; // Thursday (4)
  const firstThursday = new Date(septemberFirst);
  firstThursday.setDate(septemberFirst.getDate() + diff);
  return firstThursday;
};

const computeCurrentWeek = (season: number) => {
  const start = getSeasonStartDate(season);
  const now = new Date();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const diffWeeks = Math.floor((now.getTime() - start.getTime()) / msPerWeek);
  return Math.min(Math.max(diffWeeks + 1, 1), 18);
};

const getNFLGamesForWeek = async (week?: number, season?: number) => {
  const effectiveSeason = season ?? getCurrentSeason();
  const effectiveWeek = week ?? computeCurrentWeek(effectiveSeason);
  const res = await fetch(
    `https://${RAPIDAPI_HOST}/getNFLGamesForWeek?week=${effectiveWeek}&seasonType=reg&season=${effectiveSeason}`,
    {
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      `Failed to fetch NFL games for week ${effectiveWeek} and season ${effectiveSeason}`
    );
  }

  const data = await res.json();
  return data;
};

const getNFLPlayers = async () => {
  const res = await fetch(`https://${RAPIDAPI_HOST}/getNFLPlayerList`, {
    headers: {
      "x-rapidapi-key": RAPIDAPI_KEY,
      "x-rapidapi-host": RAPIDAPI_HOST,
    },
  });
  const data = await res.json();
  return data;
};

const getNFLTeams = async () => {
  const res = await fetch(`https://${RAPIDAPI_HOST}/getNFLTeams`, {
    headers: {
      "x-rapidapi-key": RAPIDAPI_KEY,
      "x-rapidapi-host": RAPIDAPI_HOST,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch NFL teams");
  }

  const data = await res.json();
  return data.body;
};

const getNFLGameBoxscore = async (gameId: string) => {
  const res = await fetch(
    `https://${RAPIDAPI_HOST}/getNFLBoxScore?gameID=${gameId}`,
    {
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch NFL game boxscore for game ${gameId}`);
  }

  const data = await res.json();
  return data;
};

export { getNFLGamesForWeek, getNFLPlayers, getNFLTeams, getNFLGameBoxscore };
