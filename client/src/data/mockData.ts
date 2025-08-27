// Mock data for NFL Picks Game

// Mock users
export const users = [
  {
    id: 1,
    name: "Player 1",
    email: "player1@example.com",
    isAdmin: true,
    seasonRecord: { wins: 45, losses: 23, percentage: 0.662 },
    weeklyWins: 3,
  },
  {
    id: 2,
    name: "Player 2",
    email: "player2@example.com",
    isAdmin: false,
    seasonRecord: { wins: 41, losses: 27, percentage: 0.603 },
    weeklyWins: 2,
  },
  {
    id: 3,
    name: "Player 3",
    email: "player3@example.com",
    isAdmin: false,
    seasonRecord: { wins: 38, losses: 30, percentage: 0.559 },
    weeklyWins: 1,
  },
];

// Mock NFL teams
export const nflTeams = [
  { id: 1, name: "Buffalo Bills", abbreviation: "BUF", city: "Buffalo" },
  { id: 2, name: "Miami Dolphins", abbreviation: "MIA", city: "Miami" },
  {
    id: 3,
    name: "New England Patriots",
    abbreviation: "NE",
    city: "New England",
  },
  { id: 4, name: "New York Jets", abbreviation: "NYJ", city: "New York" },
  { id: 5, name: "Baltimore Ravens", abbreviation: "BAL", city: "Baltimore" },
  {
    id: 6,
    name: "Cincinnati Bengals",
    abbreviation: "CIN",
    city: "Cincinnati",
  },
  { id: 7, name: "Cleveland Browns", abbreviation: "CLE", city: "Cleveland" },
  {
    id: 8,
    name: "Pittsburgh Steelers",
    abbreviation: "PIT",
    city: "Pittsburgh",
  },
  { id: 9, name: "Houston Texans", abbreviation: "HOU", city: "Houston" },
  {
    id: 10,
    name: "Indianapolis Colts",
    abbreviation: "IND",
    city: "Indianapolis",
  },
  {
    id: 11,
    name: "Jacksonville Jaguars",
    abbreviation: "JAX",
    city: "Jacksonville",
  },
  { id: 12, name: "Tennessee Titans", abbreviation: "TEN", city: "Tennessee" },
  { id: 13, name: "Denver Broncos", abbreviation: "DEN", city: "Denver" },
  {
    id: 14,
    name: "Kansas City Chiefs",
    abbreviation: "KC",
    city: "Kansas City",
  },
  { id: 15, name: "Las Vegas Raiders", abbreviation: "LV", city: "Las Vegas" },
  {
    id: 16,
    name: "Los Angeles Chargers",
    abbreviation: "LAC",
    city: "Los Angeles",
  },
  { id: 17, name: "Dallas Cowboys", abbreviation: "DAL", city: "Dallas" },
  { id: 18, name: "New York Giants", abbreviation: "NYG", city: "New York" },
  {
    id: 19,
    name: "Philadelphia Eagles",
    abbreviation: "PHI",
    city: "Philadelphia",
  },
  {
    id: 20,
    name: "Washington Commanders",
    abbreviation: "WAS",
    city: "Washington",
  },
  { id: 21, name: "Chicago Bears", abbreviation: "CHI", city: "Chicago" },
  { id: 22, name: "Detroit Lions", abbreviation: "DET", city: "Detroit" },
  { id: 23, name: "Green Bay Packers", abbreviation: "GB", city: "Green Bay" },
  { id: 24, name: "Minnesota Vikings", abbreviation: "MIN", city: "Minnesota" },
  { id: 25, name: "Atlanta Falcons", abbreviation: "ATL", city: "Atlanta" },
  { id: 26, name: "Carolina Panthers", abbreviation: "CAR", city: "Carolina" },
  {
    id: 27,
    name: "New Orleans Saints",
    abbreviation: "NO",
    city: "New Orleans",
  },
  {
    id: 28,
    name: "Tampa Bay Buccaneers",
    abbreviation: "TB",
    city: "Tampa Bay",
  },
  { id: 29, name: "Arizona Cardinals", abbreviation: "ARI", city: "Arizona" },
  {
    id: 30,
    name: "Los Angeles Rams",
    abbreviation: "LAR",
    city: "Los Angeles",
  },
  {
    id: 31,
    name: "San Francisco 49ers",
    abbreviation: "SF",
    city: "San Francisco",
  },
  { id: 32, name: "Seattle Seahawks", abbreviation: "SEA", city: "Seattle" },
];

// Mock NFL players for touchdown scorer picks
export const nflPlayers = [
  { id: 1, name: "Josh Allen", team: "BUF", position: "QB" },
  { id: 2, name: "Stefon Diggs", team: "BUF", position: "WR" },
  { id: 3, name: "Tua Tagovailoa", team: "MIA", position: "QB" },
  { id: 4, name: "Tyreek Hill", team: "MIA", position: "WR" },
  { id: 5, name: "Mac Jones", team: "NE", position: "QB" },
  { id: 6, name: "Aaron Rodgers", team: "NYJ", position: "QB" },
  { id: 7, name: "Lamar Jackson", team: "BAL", position: "QB" },
  { id: 8, name: "Mark Andrews", team: "BAL", position: "TE" },
  { id: 9, name: "Joe Burrow", team: "CIN", position: "QB" },
  { id: 10, name: "Ja'Marr Chase", team: "CIN", position: "WR" },
  { id: 11, name: "Deshaun Watson", team: "CLE", position: "QB" },
  { id: 12, name: "Nick Chubb", team: "CLE", position: "RB" },
  { id: 13, name: "Russell Wilson", team: "PIT", position: "QB" },
  { id: 14, name: "T.J. Watt", team: "PIT", position: "LB" },
  { id: 15, name: "C.J. Stroud", team: "HOU", position: "QB" },
  { id: 16, name: "Nico Collins", team: "HOU", position: "WR" },
  { id: 17, name: "Anthony Richardson", team: "IND", position: "QB" },
  { id: 18, name: "Jonathan Taylor", team: "IND", position: "RB" },
  { id: 19, name: "Trevor Lawrence", team: "JAX", position: "QB" },
  { id: 20, name: "Calvin Ridley", team: "JAX", position: "WR" },
  { id: 21, name: "Will Levis", team: "TEN", position: "QB" },
  { id: 22, name: "Derrick Henry", team: "TEN", position: "RB" },
  { id: 23, name: "Bo Nix", team: "DEN", position: "QB" },
  { id: 24, name: "Courtland Sutton", team: "DEN", position: "WR" },
  { id: 25, name: "Patrick Mahomes", team: "KC", position: "QB" },
  { id: 26, name: "Travis Kelce", team: "KC", position: "TE" },
  { id: 27, name: "Gardner Minshew", team: "LV", position: "QB" },
  { id: 28, name: "Davante Adams", team: "LV", position: "WR" },
  { id: 29, name: "Justin Herbert", team: "LAC", position: "QB" },
  { id: 30, name: "Keenan Allen", team: "LAC", position: "WR" },
  { id: 31, name: "Dak Prescott", team: "DAL", position: "QB" },
  { id: 32, name: "CeeDee Lamb", team: "DAL", position: "WR" },
  { id: 33, name: "Daniel Jones", team: "NYG", position: "QB" },
  { id: 34, name: "Saquon Barkley", team: "NYG", position: "RB" },
  { id: 35, name: "Jalen Hurts", team: "PHI", position: "QB" },
  { id: 36, name: "A.J. Brown", team: "PHI", position: "WR" },
  { id: 37, name: "Sam Howell", team: "WAS", position: "QB" },
  { id: 38, name: "Terry McLaurin", team: "WAS", position: "WR" },
  { id: 39, name: "Caleb Williams", team: "CHI", position: "QB" },
  { id: 40, name: "D.J. Moore", team: "CHI", position: "WR" },
  { id: 41, name: "Jared Goff", team: "DET", position: "QB" },
  { id: 42, name: "Amon-Ra St. Brown", team: "DET", position: "WR" },
  { id: 43, name: "Jordan Love", team: "GB", position: "QB" },
  { id: 44, name: "Christian Watson", team: "GB", position: "WR" },
  { id: 45, name: "Sam Darnold", team: "MIN", position: "QB" },
  { id: 46, name: "Justin Jefferson", team: "MIN", position: "WR" },
  { id: 47, name: "Kirk Cousins", team: "ATL", position: "QB" },
  { id: 48, name: "Drake London", team: "ATL", position: "WR" },
  { id: 49, name: "Bryce Young", team: "CAR", position: "QB" },
  { id: 50, name: "DJ Chark", team: "CAR", position: "WR" },
];

// Mock current week games with spreads
export const currentWeekGames = [
  {
    id: 1,
    week: 10,
    homeTeam: nflTeams.find((t) => t.abbreviation === "KC"),
    awayTeam: nflTeams.find((t) => t.abbreviation === "DEN"),
    spread: -7.5, // KC favored by 7.5
    gameTime: "2024-11-24T20:20:00Z",
    status: "scheduled",
  },
  {
    id: 2,
    week: 10,
    homeTeam: nflTeams.find((t) => t.abbreviation === "DAL"),
    awayTeam: nflTeams.find((t) => t.abbreviation === "NYG"),
    spread: -3.5, // DAL favored by 3.5
    gameTime: "2024-11-24T21:30:00Z",
    status: "scheduled",
  },
  {
    id: 3,
    week: 10,
    homeTeam: nflTeams.find((t) => t.abbreviation === "DET"),
    awayTeam: nflTeams.find((t) => t.abbreviation === "GB"),
    spread: -2.5, // DET favored by 2.5
    gameTime: "2024-11-24T17:30:00Z",
    status: "scheduled",
  },
  {
    id: 4,
    week: 10,
    homeTeam: nflTeams.find((t) => t.abbreviation === "BUF"),
    awayTeam: nflTeams.find((t) => t.abbreviation === "MIA"),
    spread: -6.5, // BUF favored by 6.5
    gameTime: "2024-11-24T18:00:00Z",
    status: "scheduled",
  },
  {
    id: 5,
    week: 10,
    homeTeam: nflTeams.find((t) => t.abbreviation === "PHI"),
    awayTeam: nflTeams.find((t) => t.abbreviation === "WAS"),
    spread: -4.0, // PHI favored by 4.0
    gameTime: "2024-11-24T18:00:00Z",
    status: "scheduled",
  },
  {
    id: 6,
    week: 10,
    homeTeam: nflTeams.find((t) => t.abbreviation === "BAL"),
    awayTeam: nflTeams.find((t) => t.abbreviation === "PIT"),
    spread: -3.0, // BAL favored by 3.0
    gameTime: "2024-11-24T18:00:00Z",
    status: "scheduled",
  },
  {
    id: 7,
    week: 10,
    homeTeam: nflTeams.find((t) => t.abbreviation === "MIN"),
    awayTeam: nflTeams.find((t) => t.abbreviation === "CHI"),
    spread: -3.5, // MIN favored by 3.5
    gameTime: "2024-11-24T18:00:00Z",
    status: "scheduled",
  },
  {
    id: 8,
    week: 10,
    homeTeam: nflTeams.find((t) => t.abbreviation === "ATL"),
    awayTeam: nflTeams.find((t) => t.abbreviation === "NO"),
    spread: -1.5, // ATL favored by 1.5
    gameTime: "2024-11-24T18:00:00Z",
    status: "scheduled",
  },
  {
    id: 9,
    week: 10,
    homeTeam: nflTeams.find((t) => t.abbreviation === "TB"),
    awayTeam: nflTeams.find((t) => t.abbreviation === "CAR"),
    spread: -7.0, // TB favored by 7.0
    gameTime: "2024-11-24T18:00:00Z",
    status: "scheduled",
  },
  {
    id: 10,
    week: 10,
    homeTeam: nflTeams.find((t) => t.abbreviation === "LAR"),
    awayTeam: nflTeams.find((t) => t.abbreviation === "SF"),
    spread: 2.5, // SF favored by 2.5 (negative spread for away team)
    gameTime: "2024-11-24T21:25:00Z",
    status: "scheduled",
  },
];

// Mock user picks for current week
export const mockUserPicks = [
  {
    id: 1,
    userId: 1,
    week: 10,
    picks: [
      { gameId: 1, selectedTeam: "KC", isCorrect: null },
      { gameId: 2, selectedTeam: "DAL", isCorrect: null },
      { gameId: 3, selectedTeam: "DET", isCorrect: null },
      { gameId: 4, selectedTeam: "BUF", isCorrect: null },
      { gameId: 5, selectedTeam: "PHI", isCorrect: null },
    ],
    lockOfWeek: { gameId: 1, selectedTeam: "KC", isCorrect: null },
    touchdownScorer: {
      playerId: 25,
      playerName: "Patrick Mahomes",
      isCorrect: null,
    },
    propBet: {
      description: "Over 250.5 passing yards - Patrick Mahomes",
      status: "pending",
      isCorrect: null,
    },
    submittedAt: "2024-11-22T10:30:00Z",
    isFinalized: true,
  },
  {
    id: 2,
    userId: 2,
    week: 10,
    picks: [
      { gameId: 1, selectedTeam: "DEN", isCorrect: null },
      { gameId: 2, selectedTeam: "NYG", isCorrect: null },
      { gameId: 3, selectedTeam: "GB", isCorrect: null },
      { gameId: 4, selectedTeam: "MIA", isCorrect: null },
      { gameId: 5, selectedTeam: "WAS", isCorrect: null },
    ],
    lockOfWeek: { gameId: 3, selectedTeam: "GB", isCorrect: null },
    touchdownScorer: {
      playerId: 43,
      playerName: "Jordan Love",
      isCorrect: null,
    },
    propBet: {
      description: "Over 2.5 TD passes - Jordan Love",
      status: "pending",
      isCorrect: null,
    },
    submittedAt: "2024-11-22T14:15:00Z",
    isFinalized: true,
  },
];

// Mock historical results
export const weeklyResults = [
  {
    week: 9,
    winner: users[0],
    results: [
      {
        userId: 1,
        correctPicks: 8,
        lockCorrect: true,
        tdScorerCorrect: false,
        propBetCorrect: true,
        totalPoints: 11,
      },
      {
        userId: 2,
        correctPicks: 6,
        lockCorrect: false,
        tdScorerCorrect: true,
        propBetCorrect: false,
        totalPoints: 7,
      },
      {
        userId: 3,
        correctPicks: 7,
        lockCorrect: true,
        tdScorerCorrect: false,
        propBetCorrect: false,
        totalPoints: 9,
      },
    ],
  },
  {
    week: 8,
    winner: users[1],
    results: [
      {
        userId: 1,
        correctPicks: 5,
        lockCorrect: false,
        tdScorerCorrect: true,
        propBetCorrect: false,
        totalPoints: 6,
      },
      {
        userId: 2,
        correctPicks: 9,
        lockCorrect: true,
        tdScorerCorrect: true,
        propBetCorrect: true,
        totalPoints: 14,
      },
      {
        userId: 3,
        correctPicks: 6,
        lockCorrect: false,
        tdScorerCorrect: false,
        propBetCorrect: true,
        totalPoints: 7,
      },
    ],
  },
  {
    week: 7,
    winner: users[2],
    results: [
      {
        userId: 1,
        correctPicks: 7,
        lockCorrect: true,
        tdScorerCorrect: false,
        propBetCorrect: false,
        totalPoints: 9,
      },
      {
        userId: 2,
        correctPicks: 6,
        lockCorrect: false,
        tdScorerCorrect: false,
        propBetCorrect: true,
        totalPoints: 7,
      },
      {
        userId: 3,
        correctPicks: 8,
        lockCorrect: true,
        tdScorerCorrect: true,
        propBetCorrect: false,
        totalPoints: 12,
      },
    ],
  },
];

// Mock prop bets for admin approval
export const pendingPropBets = [
  {
    id: 1,
    userId: 3,
    week: 10,
    description: "Lamar Jackson to rush for over 75.5 yards",
    status: "pending",
    submittedAt: "2024-11-22T16:45:00Z",
  },
  {
    id: 2,
    userId: 1,
    week: 10,
    description: "Over 250.5 passing yards - Patrick Mahomes",
    status: "approved",
    submittedAt: "2024-11-22T10:30:00Z",
    approvedAt: "2024-11-22T11:00:00Z",
  },
];

// Scoring system
export const scoringSystem = {
  correctPick: 1,
  correctLockOfWeek: 2, // Double points for lock of week
  correctTouchdownScorer: 1,
  correctPropBet: 1,
};
