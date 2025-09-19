// Test data for the points system
// This file contains sample data to verify the scoring system works correctly

// Sample user picks
const sampleUserPicks = {
  user: "60d0fe4f5311236168a109ca", // Sample MongoDB ObjectID
  week: 1,
  selections: {
    "20250904_DAL@PHI": "PHI", // Correct pick - PHI won
    "20250905_GB@CHI": "GB", // Example for another game
  },
  lockOfWeek: "PHI", // Correct lock pick - PHI won
  touchdownScorer: "4040715", // Correct TD scorer - scored in PHI game
  propBet: "Jalen Hurts will throw for over 250 yards",
  propBetStatus: "approved", // Admin approved the prop bet
  isFinalized: true,
};

// Sample game boxscores
const sampleBoxscores = [
  {
    gameId: "20250904_DAL@PHI",
    gameStatus: "Completed",
    away: {
      teamId: "9",
      teamAvbr: "DAL",
      points: 20,
      result: "L",
    },
    home: {
      teamId: "27",
      teamAvbr: "PHI",
      points: 24,
      result: "W",
    },
    gameWeek: 1,
    scoringPlays: [
      {
        teamID: "9",
        scoreType: "TD",
        team: "DAL",
        playerIDs: ["4361579", "3953687"],
      },
      {
        teamID: "27",
        scoreType: "TD",
        team: "PHI",
        playerIDs: [
          "4040715", // This player scored a TD
          "3050478",
        ],
      },
      {
        teamID: "9",
        scoreType: "TD",
        team: "DAL",
        playerIDs: ["4361579", "3953687"],
      },
      {
        teamID: "27",
        scoreType: "TD",
        team: "PHI",
        playerIDs: ["4040715", "3050478"],
      },
    ],
  },
];

// Expected scoring result for this user
// +1 for correct spread pick on PHI
// +1 for correct lock of the week (PHI)
// +1 for correct TD scorer
// +1 for approved prop bet
// Total: 4 points
const expectedScore = {
  userId: "60d0fe4f5311236168a109ca",
  points: 4,
  spreadCorrect: 1,
  spreadTotal: 1,
  lockCorrect: true,
  tdScorerCorrect: true,
  propBetCorrect: true,
};

/*
 * To manually test this scoring system:
 *
 * 1. Add the sample user pick to the database:
 *    - Create a user with ID "60d0fe4f5311236168a109ca"
 *    - Insert the pick data for week 1
 *
 * 2. Add the sample boxscore to the database:
 *    - Ensure the gameboxscore collection has this data
 *
 * 3. Call the calculate weekly points API:
 *    POST /scoring/calculate-weekly/1/2025
 *
 * 4. Verify the user's points were updated:
 *    GET /scoring/user/60d0fe4f5311236168a109ca/season/2025
 *
 * Expected result: User should have 4 points
 */
