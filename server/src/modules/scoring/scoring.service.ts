import { getNFLGamesForWeek } from "../../api/nfl.js";
import Game from "../games/games.model.js";
import Pick from "../picks/pick.model.js";
import User from "../users/user.model.js";
import { broadcastLiveEvent } from "../live/live.controller.js";

type BoxScore = any;

const determineWinnerAbv = (box: BoxScore): string | null => {
  // Expect box contains fields like homeTeamAbv, awayTeamAbv, homeScore, awayScore
  const h = Number((box?.homeScore ?? box?.HomeScore ?? 0) as number);
  const a = Number((box?.awayScore ?? box?.AwayScore ?? 0) as number);
  const homeAbv = String(box?.homeTeamAbv ?? box?.home ?? box?.Home ?? "");
  const awayAbv = String(box?.awayTeamAbv ?? box?.away ?? box?.Away ?? "");
  if (Number.isFinite(h) && Number.isFinite(a)) {
    if (h > a) return homeAbv || null;
    if (a > h) return awayAbv || null;
  }
  return null;
};

export const fetchBoxScore = async (gameId: string): Promise<BoxScore | null> => {
  // Placeholder: use getNFLGamesForWeek or a specific Tank01 box score endpoint if available
  // Here we fallback to stored Game doc since the dedicated endpoint isn't defined in current repo
  const g = await Game.findOne({ gameID: gameId }).lean();
  return g as any;
};

export const resolveWeek = async (week: number) => {
  const games = await Game.find({ gameWeek: new RegExp(String(week)) }).lean();
  const winners = new Map<string, string | null>();
  for (const g of games) {
    const box = await fetchBoxScore((g as any).gameID);
    const winnerAbv = determineWinnerAbv(box);
    winners.set((g as any).gameID, winnerAbv);
  }

  const picks = await Pick.find({ week, isFinalized: true }).lean();
  for (const p of picks) {
    const outcomes: Record<string, boolean | null> = {};
    let correctCount = 0;
    for (const [gid, teamAbv] of Object.entries(p.selections || {})) {
      const w = winners.get(gid) ?? null;
      const ok = w ? w === (teamAbv as string) : null;
      outcomes[gid] = ok;
      if (ok === true) correctCount += 1;
    }

    // lock of week bonus is a view concern (points). We only keep outcomes per game here.
    await Pick.updateOne(
      { _id: p._id },
      { $set: { outcomes, status: "SETTLED" } }
    );

    // Update user aggregates (simple version): totalBets/correctBets
    const total = Object.keys(p.selections || {}).length;
    const userInc: any = { totalBets: total, correctBets: correctCount };
    await User.updateOne({ _id: p.user }, {
      $inc: userInc,
    });

    // Notify clients
    broadcastLiveEvent({ type: "pick:update", payload: { userId: String(p.user), week } });
  }
};


