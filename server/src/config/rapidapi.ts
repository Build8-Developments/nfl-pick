export const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
export const RAPIDAPI_HOST =
  process.env.RAPIDAPI_HOST ||
  "tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com";

export const ensureRapidApiConfigured = () => {
  if (!RAPIDAPI_KEY) {
    throw new Error("RAPIDAPI_KEY is not set in environment");
  }
};
