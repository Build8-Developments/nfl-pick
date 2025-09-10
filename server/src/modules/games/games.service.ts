import type { IGame } from "./games.model.js";
import Game from "./games.model.js";

export const getAllGames = async () => {
  const games = await Game.find();
  return games;
};

export const getGameById = async (id: string) => {
  const game = await Game.findById(id);
  return game;
};

export const insertGames = async (games: any) => {
  // Use native collection bulkWrite to bypass full Mongoose validation
  const operations = (games as IGame[]).map((game) => ({
    updateOne: {
      filter: { gameID: game.gameID },
      update: { $set: game },
      upsert: true,
    },
  }));

  const result = await Game.collection.bulkWrite(operations as any, {
    ordered: false,
  });
  return result;
};
