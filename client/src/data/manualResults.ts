export type ManualWeekSheet = {
  week: number;
  games: Array<{
    gameNumber: number;
    gavin: string;
    luke: string;
    mike: string;
    away?: string;
    home?: string;
    spread?: string;
  }>;
  record: { gavin: string; luke: string; mike: string };
  lockOTW: { gavin: string; luke: string; mike: string };
  tdScorer: { gavin: string; luke: string; mike: string };
  propOTW: { gavin: string; luke: string; mike: string };
  totals: { gavin: number; luke: number; mike: number };
  note?: string;
};

export const manualWeekSheets: ManualWeekSheet[] = [
  {
    week: 1,
    games: [
      { gameNumber: 1, gavin: "PHI", luke: "PHI", mike: "PHI" },
      { gameNumber: 2, gavin: "KC", luke: "LAC", mike: "LAC" },
      { gameNumber: 3, gavin: "ARI", luke: "ARI", mike: "ARI" },
      { gameNumber: 4, gavin: "CAR", luke: "JAX", mike: "CAR" },
      { gameNumber: 5, gavin: "CIN", luke: "CIN", mike: "CIN" },
      { gameNumber: 6, gavin: "NE", luke: "LV", mike: "LV" },
      { gameNumber: 7, gavin: "MIA", luke: "MIA", mike: "MIA" },
      { gameNumber: 8, gavin: "NYG", luke: "NYG", mike: "NYG" },
      { gameNumber: 9, gavin: "PIT", luke: "PIT", mike: "PIT" },
      { gameNumber: 10, gavin: "TB", luke: "TB", mike: "TB" },
      { gameNumber: 11, gavin: "SEA", luke: "SEA", mike: "SF" },
      { gameNumber: 12, gavin: "DEN", luke: "DEN", mike: "DEN" },
      { gameNumber: 13, gavin: "GB", luke: "DET", mike: "DET" },
      { gameNumber: 14, gavin: "LAR", luke: "LAR", mike: "LAR" },
      { gameNumber: 15, gavin: "BUF", luke: "BUF", mike: "BUF" },
      { gameNumber: 16, gavin: "CHI", luke: "CHI", mike: "MIN" },
    ],
    record: { gavin: "5 - 11", luke: "7 - 9", mike: "8 - 8" },
    lockOTW: { gavin: "DEN", luke: "CIN", mike: "CIN" },
    tdScorer: { gavin: "D. Henry", luke: "Chase Brown", mike: "Chase Brown" },
    propOTW: {
      gavin: "Mclaurin 60+ Yards",
      luke: "BTJ O5.5 Rec's",
      mike: "Nabers O80.5 Yards",
    },
    totals: { gavin: 7, luke: 8, mike: 9 },
    note: "Week 1 retroactively corrected to reflect accurate stats/history.",
  },
  {
    week: 2,
    games: [
      { gameNumber: 1, gavin: "GB", luke: "GB", mike: "WAS" },
      { gameNumber: 2, gavin: "BUF", luke: "BUF", mike: "BUF" },
      { gameNumber: 3, gavin: "DAL", luke: "DAL", mike: "NYG" },
      { gameNumber: 4, gavin: "CIN", luke: "CIN", mike: "JAX" },
      { gameNumber: 5, gavin: "MIA", luke: "NE", mike: "NE" },
      { gameNumber: 6, gavin: "BAL", luke: "BAL", mike: "CLE" },
      { gameNumber: 7, gavin: "LAR", luke: "TEN", mike: "LAR" },
      { gameNumber: 8, gavin: "DET", luke: "DET", mike: "CHI" },
      { gameNumber: 9, gavin: "PIT", luke: "SEA", mike: "SEA" },
      { gameNumber: 10, gavin: "SF", luke: "SF", mike: "SF" },
      { gameNumber: 11, gavin: "ARI", luke: "ARI", mike: "CAR" },
      { gameNumber: 12, gavin: "DEN", luke: "DEN", mike: "DEN" },
      { gameNumber: 13, gavin: "KC", luke: "KC", mike: "PHI" },
      { gameNumber: 14, gavin: "MIN", luke: "MIN", mike: "ATL" },
      { gameNumber: 15, gavin: "TB", luke: "TB", mike: "TB" },
      { gameNumber: 16, gavin: "LAC", luke: "LAC", mike: "LAC" },
    ],
    record: { gavin: "7 - 7", luke: "9 - 5", mike: "9 - 5" },
    lockOTW: { gavin: "LAC", luke: "DAL", mike: "ATL" },
    tdScorer: { gavin: "LAMAR", luke: "CONNER", mike: "BUCKY" },
    propOTW: {
      gavin: "Croskey Merritt O",
      luke: "Warren O4.5 Rec’s",
      mike: "KEON O40 rec (-136)",
    },
    totals: { gavin: 7, luke: 10, mike: 10 },
  },
];


