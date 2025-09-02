import { RAPIDAPI_HOST, RAPIDAPI_KEY } from "../config/environment.js";

const getNFLGamesForWeek = async (week: number, season: number) => {
  const res = await fetch(
    `https://${RAPIDAPI_HOST}/getNFLGamesForWeek?week=${week}&seasonType=reg&season=${season}`,
    {
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      `Failed to fetch NFL games for week ${week} and season ${season}`
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

export { getNFLGamesForWeek, getNFLPlayers };
