# NFL Pick Points System

## Overview

The NFL Pick application uses a comprehensive points system to score users based on their weekly picks. The system calculates points at the end of each week and maintains both weekly and season-long statistics.

## Points Breakdown

### 1. Spread Picks (+1 point each)

- **What it is**: Users pick the winner of each game
- **Scoring**: +1 point for each correct spread pick
- **Example**: If a user picks DAL to beat PHI and DAL wins, they get +1 point

### 2. Lock of the Week (+1 point)

- **What it is**: Users select one team as their "lock" - a team they're most confident will win
- **Scoring**: +1 point if the lock team wins at least one game that week
- **Example**: If a user locks DAL and DAL wins their game, they get +1 point

### 3. Touchdown Scorer (+1 point)

- **What it is**: Users pick a specific player who will score a touchdown
- **Scoring**: +1 point if the selected player scores at least one touchdown
- **Example**: If a user picks CeeDee Lamb and he scores a TD, they get +1 point

### 4. Prop Bet of the Week (+1 point)

- **What it is**: Users submit a custom prop bet (approved by admin)
- **Scoring**: +1 point if the prop bet is approved and correct
- **Example**: "Dak Prescott throws for 300+ yards" - if approved and correct, +1 point

## Data Models

### Pick Model (`pick.model.ts`)

```typescript
interface IPick {
  user: ObjectId;
  week: number;
  selections: Record<string, string>; // gameId -> teamAbv
  lockOfWeek?: string; // teamAbv
  touchdownScorer?: string; // playerId
  propBet?: string;
  propBetStatus?: "pending" | "approved" | "rejected";
  isFinalized?: boolean;
  // ... other fields
}
```

### Scoring Model (`scoring.model.ts`)

```typescript
interface IScoring {
  user: ObjectId;
  gameID: string;
  week: number;
  season: number;
  pointsEarned: number;
  spreadPick?: { selectedTeam; actualWinner; isCorrect; points };
  lockPick?: { selectedTeam; actualWinner; isCorrect; points };
  touchdownScorer?: { selectedPlayer; actualScorer; isCorrect; points };
  propBet?: { description; isCorrect; points };
  // ... other fields
}
```

### Game Boxscore Model (`boxscore.model.ts`)

```typescript
interface BoxscoreDocument {
  gameId: string;
  gameStatus: string;
  away: { teamId; teamAvbr; points; result };
  home: { teamId; teamAvbr; points; result };
  gameWeek: number;
  scoringPlays: Array<{
    teamID: string;
    scoreType: string;
    team: string;
    playerIDs: string[];
  }>;
}
```

## API Endpoints

### Admin Endpoints

- `POST /scoring/calculate-weekly/:week/:season` - Calculate points for all users for a specific week

### User Endpoints

- `GET /scoring/user/:userId/week/:week/:season` - Get user's scoring for a specific week
- `GET /scoring/user/:userId/season/:season` - Get user's total season points

### Public Endpoints

- `GET /scoring/weekly-summary/:week/:season` - Get weekly summary for all users

## How It Works

### 1. Weekly Calculation Process

When an admin calls the calculate weekly points endpoint:

1. **Get Completed Games**: Fetch all games with `gameStatus: "Completed"` for the week
2. **Get Finalized Picks**: Fetch all user picks with `isFinalized: true` for the week
3. **Calculate Points**: For each user, calculate points based on:
   - Spread picks: Check if selected team won
   - Lock of week: Check if lock team won any game
   - TD scorer: Check if player scored in any game's `scoringPlays`
   - Prop bet: Check if `propBetStatus === "approved"`
4. **Update User Points**: Add calculated points to user's total season points

### 2. Scoring Logic

#### Spread Picks

```typescript
// For each game in user's selections
const winner =
  game.home.result === "W" ? game.home.teamAvbr : game.away.teamAvbr;
const correct = selectedTeam === winner && winner !== "TIE";
if (correct) points += 1;
```

#### Lock of the Week

```typescript
// Find game with lock team
const lockTeamGame = gameBoxscores.find(
  (g) => g.home.teamAvbr === lockOfWeek || g.away.teamAvbr === lockOfWeek
);
const lockTeamWon =
  (lockTeamGame.home.teamAvbr === lockOfWeek &&
    lockTeamGame.home.result === "W") ||
  (lockTeamGame.away.teamAvbr === lockOfWeek &&
    lockTeamGame.away.result === "W");
if (lockTeamWon) points += 1;
```

#### Touchdown Scorer

```typescript
// Check all games for TD scorer
for (const game of gameBoxscores) {
  const tdPlays = game.scoringPlays.filter((play) => play.scoreType === "TD");
  for (const tdPlay of tdPlays) {
    if (tdPlay.playerIDs.includes(touchdownScorer)) {
      points += 1;
      break;
    }
  }
}
```

#### Prop Bet

```typescript
// Prop bets are manually evaluated by admin
if (propBet && propBetStatus === "approved") {
  points += 1;
}
```

### 3. Leaderboard Integration

The leaderboard uses the scoring system in two ways:

1. **Weekly Leaderboard**: Shows points for a specific week using scoring records
2. **Season Leaderboard**: Shows total points accumulated across all weeks

## Usage Examples

### Calculate Points for Week 1

```bash
POST /scoring/calculate-weekly/1/2024
```

### Get User's Week 1 Results

```bash
GET /scoring/user/64a1b2c3d4e5f6789012345/week/1/2024
```

### Get Weekly Summary

```bash
GET /scoring/weekly-summary/1/2024
```

Response:

```json
{
  "success": true,
  "data": {
    "week": 1,
    "season": 2024,
    "totalUsers": 25,
    "userResults": [
      {
        "userId": "64a1b2c3d4e5f6789012345",
        "username": "john_doe",
        "points": 8,
        "spreadCorrect": 5,
        "spreadTotal": 6,
        "lockCorrect": true,
        "tdScorerCorrect": true,
        "propBetCorrect": true
      }
    ],
    "summary": {
      "totalSpreadPoints": 120,
      "totalLockPoints": 15,
      "totalTdScorerPoints": 8,
      "totalPropBetPoints": 3,
      "totalPoints": 146
    }
  }
}
```

## Key Features

1. **Automatic Calculation**: Points are calculated automatically based on game results
2. **Detailed Breakdown**: Each point source is tracked separately
3. **Weekly Summaries**: Comprehensive weekly statistics for all users
4. **Season Tracking**: Total points accumulated across all weeks
5. **Admin Controls**: Admins can approve/reject prop bets and trigger calculations
6. **Real-time Updates**: Leaderboard updates immediately after point calculation

## Database Indexes

The system uses several indexes for optimal performance:

- `{ user: 1, week: 1 }` - Unique index on picks
- `{ week: 1, lockOfWeek: 1 }` - Unique index for lock of week
- `{ week: 1, touchdownScorer: 1 }` - Unique index for TD scorer
- `{ user: 1, week: 1, season: 1 }` - Index on scoring records

This ensures fast lookups and prevents duplicate picks for the same week.
