import { RAPIDAPI_HOST, RAPIDAPI_KEY } from "../../config/environment.js";
import BettingOdds, { type IBettingOdds } from "./bettingOdds.model.js";

export const getNFLBettingOddsForGame = async (gameId: string) => {
  const res = await fetch(
    `https://${RAPIDAPI_HOST}/getNFLBettingOdds?gameID=${gameId}`,
    {
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch NFL betting odds for game ${gameId}`);
  }

  const data = await res.json();
  return data.body;
};

export const getLocalBettingOddsForGame = async (gameId: string) => {
  const bettingOdds = await BettingOdds.findOne({ gameID: gameId });
  return bettingOdds as IBettingOdds;
};
