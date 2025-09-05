import { RAPIDAPI_KEY, RAPIDAPI_HOST, ensureRapidApiConfigured } from "../config/rapidapi.js";

// Tank01 API types based on the provided endpoint
export interface Tank01BoxScoreResponse {
  gameID: string;
  gameDate: string;
  homeTeam: string;
  awayTeam: string;
  teamIDHome: string;
  teamIDAway: string;
  homeScore: number;
  awayScore: number;
  gameStatus: string;
  quarter: number;
  timeRemaining: string;
  lastUpdated: string;
  homeTeamStats: TeamStats;
  awayTeamStats: TeamStats;
  homeTeamPlayers: PlayerStats[];
  awayTeamPlayers: PlayerStats[];
  playByPlay?: PlayByPlayEvent[];
  fantasyPoints?: FantasyPoints;
}

export interface TeamStats {
  teamID: string;
  teamName: string;
  teamAbv: string;
  totalYards: number;
  passingYards: number;
  rushingYards: number;
  turnovers: number;
  penalties: number;
  timeOfPossession: string;
  firstDowns: number;
  thirdDownConversions: number;
  thirdDownAttempts: number;
  fourthDownConversions: number;
  fourthDownAttempts: number;
  redZoneAttempts: number;
  redZoneScores: number;
}

export interface PlayerStats {
  playerID: string;
  playerName: string;
  position: string;
  teamID: string;
  // Passing stats
  passAttempts?: number;
  passCompletions?: number;
  passYards?: number;
  passTD?: number;
  passInterceptions?: number;
  // Rushing stats
  carries?: number;
  rushYards?: number;
  rushTD?: number;
  fumbles?: number;
  // Receiving stats
  receptions?: number;
  receivingYards?: number;
  receivingTD?: number;
  targets?: number;
  // Kicking stats
  fgMade?: number;
  fgMissed?: number;
  xpMade?: number;
  xpMissed?: number;
  // Defense stats
  totalTackles?: number;
  soloTackles?: number;
  tacklesForLoss?: number;
  qbHits?: number;
  interceptions?: number;
  sacks?: number;
  passDeflections?: number;
  fumblesRecovered?: number;
  // Fantasy points
  fantasyPoints?: number;
}

export interface PlayByPlayEvent {
  playID: string;
  quarter: number;
  time: string;
  down: number;
  distance: number;
  yardLine: string;
  description: string;
  homeScore: number;
  awayScore: number;
  playType: string;
  playerID?: string;
  playerName?: string;
}

export interface FantasyPoints {
  homeTeamTotal: number;
  awayTeamTotal: number;
  homeTeamPlayers: Record<string, number>;
  awayTeamPlayers: Record<string, number>;
}

// Fantasy scoring rules from the API call
export const FANTASY_SCORING_RULES = {
  passYards: 0.04,
  passAttempts: 0,
  passTD: 4,
  passCompletions: 0,
  passInterceptions: -2,
  pointsPerReception: 0.5,
  carries: 0.2,
  rushYards: 0.1,
  rushTD: 6,
  fumbles: -2,
  receivingYards: 0.1,
  receivingTD: 6,
  targets: 0,
  defTD: 6,
  fgMade: 3,
  fgMissed: -3,
  xpMade: 1,
  xpMissed: -1,
  idpTotalTackles: 0,
  idpSoloTackles: 0,
  idpTFL: 0,
  idpQbHits: 0,
  idpInt: 0,
  idpSacks: 0,
  idpPassDeflections: 0,
  idpFumblesRecovered: 0,
};

export class Tank01APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public gameID?: string
  ) {
    super(message);
    this.name = "Tank01APIError";
  }
}

export const getNFLBoxScore = async (
  gameID: string,
  options: {
    playByPlay?: boolean;
    fantasyPoints?: boolean;
    twoPointConversions?: number;
    passYards?: number;
    passAttempts?: number;
    passTD?: number;
    passCompletions?: number;
    passInterceptions?: number;
    pointsPerReception?: number;
    carries?: number;
    rushYards?: number;
    rushTD?: number;
    fumbles?: number;
    receivingYards?: number;
    receivingTD?: number;
    targets?: number;
    defTD?: number;
    fgMade?: number;
    fgMissed?: number;
    xpMade?: number;
    xpMissed?: number;
    idpTotalTackles?: number;
    idpSoloTackles?: number;
    idpTFL?: number;
    idpQbHits?: number;
    idpInt?: number;
    idpSacks?: number;
    idpPassDeflections?: number;
    idpFumblesRecovered?: number;
  } = {}
): Promise<Tank01BoxScoreResponse> => {
  try {
    ensureRapidApiConfigured();

    const baseUrl = "https://tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com/getNFLBoxScore";
    
    // Build query parameters with defaults from the example
    const params = new URLSearchParams({
      gameID,
      playByPlay: String(options.playByPlay ?? true),
      fantasyPoints: String(options.fantasyPoints ?? true),
      twoPointConversions: String(options.twoPointConversions ?? 2),
      passYards: String(options.passYards ?? FANTASY_SCORING_RULES.passYards),
      passAttempts: String(options.passAttempts ?? FANTASY_SCORING_RULES.passAttempts),
      passTD: String(options.passTD ?? FANTASY_SCORING_RULES.passTD),
      passCompletions: String(options.passCompletions ?? FANTASY_SCORING_RULES.passCompletions),
      passInterceptions: String(options.passInterceptions ?? FANTASY_SCORING_RULES.passInterceptions),
      pointsPerReception: String(options.pointsPerReception ?? FANTASY_SCORING_RULES.pointsPerReception),
      carries: String(options.carries ?? FANTASY_SCORING_RULES.carries),
      rushYards: String(options.rushYards ?? FANTASY_SCORING_RULES.rushYards),
      rushTD: String(options.rushTD ?? FANTASY_SCORING_RULES.rushTD),
      fumbles: String(options.fumbles ?? FANTASY_SCORING_RULES.fumbles),
      receivingYards: String(options.receivingYards ?? FANTASY_SCORING_RULES.receivingYards),
      receivingTD: String(options.receivingTD ?? FANTASY_SCORING_RULES.receivingTD),
      targets: String(options.targets ?? FANTASY_SCORING_RULES.targets),
      defTD: String(options.defTD ?? FANTASY_SCORING_RULES.defTD),
      fgMade: String(options.fgMade ?? FANTASY_SCORING_RULES.fgMade),
      fgMissed: String(options.fgMissed ?? FANTASY_SCORING_RULES.fgMissed),
      xpMade: String(options.xpMade ?? FANTASY_SCORING_RULES.xpMade),
      xpMissed: String(options.xpMissed ?? FANTASY_SCORING_RULES.xpMissed),
      idpTotalTackles: String(options.idpTotalTackles ?? FANTASY_SCORING_RULES.idpTotalTackles),
      idpSoloTackles: String(options.idpSoloTackles ?? FANTASY_SCORING_RULES.idpSoloTackles),
      idpTFL: String(options.idpTFL ?? FANTASY_SCORING_RULES.idpTFL),
      idpQbHits: String(options.idpQbHits ?? FANTASY_SCORING_RULES.idpQbHits),
      idpInt: String(options.idpInt ?? FANTASY_SCORING_RULES.idpInt),
      idpSacks: String(options.idpSacks ?? FANTASY_SCORING_RULES.idpSacks),
      idpPassDeflections: String(options.idpPassDeflections ?? FANTASY_SCORING_RULES.idpPassDeflections),
      idpFumblesRecovered: String(options.idpFumblesRecovered ?? FANTASY_SCORING_RULES.idpFumblesRecovered),
    });

    const url = `${baseUrl}?${params.toString()}`;

    console.log(`[Tank01] Fetching box score for game: ${gameID}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Tank01] API Error for game ${gameID}:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });

      if (response.status === 404) {
        throw new Tank01APIError(
          `Game not found: ${gameID}`,
          response.status,
          gameID
        );
      } else if (response.status === 429) {
        throw new Tank01APIError(
          "Rate limit exceeded. Please try again later.",
          response.status,
          gameID
        );
      } else if (response.status >= 500) {
        throw new Tank01APIError(
          "Tank01 API server error. Please try again later.",
          response.status,
          gameID
        );
      } else {
        throw new Tank01APIError(
          `API request failed: ${response.statusText}`,
          response.status,
          gameID
        );
      }
    }

    const data = await response.json();

    // Validate response structure
    if (!data || typeof data !== "object") {
      throw new Tank01APIError(
        "Invalid response format from Tank01 API",
        response.status,
        gameID
      );
    }

    // Check if the game exists and is valid
    if (!data.gameID || data.gameID !== gameID) {
      throw new Tank01APIError(
        `Game ID mismatch: expected ${gameID}, got ${data.gameID}`,
        response.status,
        gameID
      );
    }

    console.log(`[Tank01] Successfully fetched box score for game: ${gameID}`);
    return data as Tank01BoxScoreResponse;

  } catch (error) {
    if (error instanceof Tank01APIError) {
      throw error;
    }

    console.error(`[Tank01] Unexpected error fetching box score for game ${gameID}:`, error);
    throw new Tank01APIError(
      `Failed to fetch box score: ${error instanceof Error ? error.message : "Unknown error"}`,
      undefined,
      gameID
    );
  }
};

// Helper function to validate game ID format for 2025 season
export const validateGameID = (gameID: string): boolean => {
  // Expected format: YYYYMMDD_TEAM@TEAM (e.g., 20241020_CAR@WSH)
  const gameIDPattern = /^\d{8}_[A-Z]{2,4}@[A-Z]{2,4}$/;
  return gameIDPattern.test(gameID);
};

// Helper function to check if a game is from 2025 season
export const is2025SeasonGame = (gameID: string): boolean => {
  if (!validateGameID(gameID)) return false;
  
  const year = parseInt(gameID.substring(0, 4));
  return year === 2025;
};

// Helper function to get current active games for 2025 season
export const getActiveGames = async (): Promise<string[]> => {
  // This would typically query your games database for active 2025 games
  // For now, return empty array - this should be implemented based on your game data
  return [];
};
