import Player from "./players.model.js";

export interface GetPlayersParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const getAllPlayersService = async ({
  page = 1,
  limit = 20,
  search,
}: GetPlayersParams) => {
  const safePage = Number.isFinite(page) && page! > 0 ? page! : 1;
  const safeLimit =
    Number.isFinite(limit) && limit! > 0 && limit! <= 100 ? limit! : 20;

  const query: Record<string, any> = {};
  if (search && search.trim().length > 0) {
    query.longName = { $regex: new RegExp(search.trim(), "i") };
  }

  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    Player.find(query).skip(skip).limit(safeLimit).lean(),
    Player.countDocuments(query),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    },
  };
};

export const insertPlayers = async (players: any) => {
  const newPlayers = await Player.insertMany(players);
  return newPlayers;
};
