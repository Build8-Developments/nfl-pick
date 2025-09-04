import type { Request, Response } from "express";
import User from "../users/user.model.js";
import Pick from "../picks/pick.model.js";
import Game from "../games/games.model.js";

const parseGameDateTime = (gameDate?: string, gameTime?: string) => {
  if (!gameDate || !gameTime) return new Date(0);
  const yyyy = Number(gameDate.slice(0, 4));
  const mm = Number(gameDate.slice(4, 6));
  const dd = Number(gameDate.slice(6, 8));
  const m = gameTime.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])/i);
  let hours = 12;
  let minutes = 0;
  if (m) {
    hours = Number(m[1]);
    minutes = m[2] ? Number(m[2]) : 0;
    const meridiem = (m?.[3] ?? "a").toLowerCase();
    if (meridiem === "p" && hours !== 12) hours += 12;
    if (meridiem === "a" && hours === 12) hours = 0;
  }
  return new Date(yyyy, mm - 1, dd, hours, minutes, 0, 0);
};

export const getDashboard = async (_req: Request, res: Response) => {
  const [totalUsers, totalPicks, games] = await Promise.all([
    User.countDocuments({}),
    Pick.countDocuments({}),
    Game.find({}).lean(),
  ]);

  const now = new Date();
  const upcoming = games
    .map((g: any) => ({ g, dt: parseGameDateTime(g.gameDate, g.gameTime) }))
    .filter((x) => x.dt.getTime() > now.getTime())
    .sort((a, b) => a.dt.getTime() - b.dt.getTime())
    .slice(0, 10)
    .map((x) => ({
      gameID: x.g.gameID,
      gameWeek: x.g.gameWeek,
      home: x.g.home,
      away: x.g.away,
      gameDate: x.g.gameDate,
      gameTime: x.g.gameTime,
    }));

  res.json({
    success: true,
    data: {
      totalUsers,
      totalPicks,
      upcomingGames: upcoming,
    },
  });
};


