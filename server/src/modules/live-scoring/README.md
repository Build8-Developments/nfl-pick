# Live Scoring System

This module integrates with the Tank01 NFL Box Score API to provide real-time game scoring and pick evaluation for the 2025 NFL season.

## Features

- **Real-time Game Data**: Fetch live box scores, player stats, and game results
- **Fantasy Points Calculation**: Calculate fantasy points based on customizable scoring rules
- **Pick Evaluation**: Compare user picks against actual game results
- **Live Leaderboards**: Real-time scoring and standings updates
- **Error Handling**: Comprehensive validation and error handling for API calls

## API Endpoints

### Game Results

#### `POST /api/v1/live-scoring/fetch/:gameID`
Fetch and save game result from Tank01 API.

**Parameters:**
- `gameID` (string): Game ID in format `YYYYMMDD_TEAM@TEAM` (e.g., `20250120_CAR@WSH`)

**Response:**
```json
{
  "success": true,
  "message": "Game result saved successfully for 20250120_CAR@WSH",
  "data": {
    "gameID": "20250120_CAR@WSH",
    "season": 2025,
    "week": 1,
    "homeTeam": "WSH",
    "awayTeam": "CAR",
    "homeScore": 24,
    "awayScore": 17,
    "winner": "WSH",
    "isFinal": true,
    "playerStats": [...],
    "fantasyPoints": {...}
  }
}
```

#### `POST /api/v1/live-scoring/process/:gameID`
Process live scoring for a game (fetch + evaluate picks).

**Parameters:**
- `gameID` (string): Game ID in format `YYYYMMDD_TEAM@TEAM`

**Response:**
```json
{
  "success": true,
  "message": "Live scoring processed for 20250120_CAR@WSH",
  "data": {
    "gameResult": {...},
    "scoringResults": [...],
    "summary": {
      "totalUsers": 5,
      "gameID": "20250120_CAR@WSH",
      "homeTeam": "WSH",
      "awayTeam": "CAR",
      "homeScore": 24,
      "awayScore": 17,
      "winner": "WSH",
      "isFinal": true
    }
  }
}
```

#### `GET /api/v1/live-scoring/game/:gameID`
Get saved game result.

**Parameters:**
- `gameID` (string): Game ID in format `YYYYMMDD_TEAM@TEAM`

#### `GET /api/v1/live-scoring/week?week=1&season=2025`
Get all game results for a specific week.

**Query Parameters:**
- `week` (number): Week number (1-18)
- `season` (number): Season year

#### `GET /api/v1/live-scoring/active?week=1&season=2025`
Get active (non-final) games for a specific week.

**Query Parameters:**
- `week` (number): Week number (1-18)
- `season` (number): Season year

### User Scoring

#### `GET /api/v1/live-scoring/user?userId=123&week=1&season=2025`
Get user's scoring for a specific week.

**Query Parameters:**
- `userId` (string): User ID
- `week` (number): Week number (1-18)
- `season` (number): Season year

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPoints": 8,
    "fantasyPoints": 24.5,
    "correctPicks": 3,
    "totalPicks": 4,
    "gameResults": [...]
  }
}
```

### Leaderboards

#### `GET /api/v1/live-scoring/leaderboard?week=1&season=2025`
Get live leaderboard for a specific week.

**Query Parameters:**
- `week` (number): Week number (1-18)
- `season` (number): Season year
- `includeFantasy` (boolean, optional): Include fantasy points in response

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "user": "60f7b3b3b3b3b3b3b3b3b3b3",
      "username": "player1",
      "avatar": "/uploads/avatars/avatar1.jpg",
      "wins": 3,
      "losses": 1,
      "winPct": 0.75,
      "totalPoints": 8,
      "fantasyPoints": 24.5
    }
  ]
}
```

## Fantasy Scoring Rules

The system uses the following default fantasy scoring rules (configurable in `tank01.ts`):

- **Passing**: 0.04 points per yard, 4 points per TD, -2 points per interception
- **Rushing**: 0.1 points per yard, 6 points per TD, -2 points per fumble
- **Receiving**: 0.1 points per yard, 6 points per TD, 0.5 points per reception
- **Kicking**: 3 points per FG made, -3 points per FG missed, 1 point per XP made, -1 point per XP missed
- **Defense**: 6 points per defensive TD, various tackle/sack points

## Error Handling

The system includes comprehensive error handling:

- **Invalid Game ID**: Returns 400 with format validation error
- **Non-2025 Season**: Returns 400 for games outside 2025 season
- **API Rate Limiting**: Returns 429 when rate limit exceeded
- **Game Not Found**: Returns 404 when Tank01 API returns no data
- **Server Errors**: Returns 500 for internal server errors

## Usage Examples

### Fetch Game Result
```bash
curl -X POST "http://localhost:3000/api/v1/live-scoring/fetch/20250120_CAR@WSH"
```

### Process Live Scoring
```bash
curl -X POST "http://localhost:3000/api/v1/live-scoring/process/20250120_CAR@WSH"
```

### Get Week Results
```bash
curl "http://localhost:3000/api/v1/live-scoring/week?week=1&season=2025"
```

### Get Live Leaderboard
```bash
curl "http://localhost:3000/api/v1/live-scoring/leaderboard?week=1&season=2025&includeFantasy=true"
```

## Database Models

### GameResult
Stores complete game data including scores, player stats, and fantasy points.

### Scoring
Tracks user scoring for each game including pick results and fantasy points.

## Configuration

Set the following environment variables:

```env
RAPIDAPI_KEY=your_rapidapi_key
RAPIDAPI_HOST=tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com
```

## Rate Limiting

- 10 requests per minute per IP address for Tank01 API calls
- Configurable in `liveScoring.middleware.ts`

## Future Enhancements

- Real-time WebSocket updates
- Automated game result polling
- Advanced prop bet evaluation
- Historical data analysis
- Performance metrics and caching
