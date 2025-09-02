import { useState, useEffect } from "react";
import { useAuth } from "../contexts/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Clock,
  Lock,
  Target,
  TrendingUp,
  Check,
  ChevronsUpDown,
  AlertTriangle,
  Save,
} from "lucide-react";
// Replace mock data with real API data
import { apiClient } from "@/lib/api";
import type { IPlayer } from "@/types/player.type";
import type { IGame } from "@/types/game.type";
import type { ITeam } from "@/types/team.type";
import { memCache } from "@/lib/memCache";

const Picks = () => {
  const { currentUser } = useAuth();
  const [picks, setPicks] = useState<Record<number, string>>({});
  const [lockOfWeek, setLockOfWeek] = useState("");
  const [touchdownScorer, setTouchdownScorer] = useState("");
  const [propBet, setPropBet] = useState("");
  const [propBetOdds, setPropBetOdds] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [playerSearchOpen, setPlayerSearchOpen] = useState(false);
  const [playerSearchValue, setPlayerSearchValue] = useState("");
  const [players, setPlayers] = useState<IPlayer[]>([]);
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [games, setGames] = useState<IGame[]>([]);
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
  const [oddsByGameId, setOddsByGameId] = useState<
    Record<string, { awayTeamSpread?: string; homeTeamSpread?: string }>
  >({});
  // Track loading and error if needed for UI; currently not displayed
  const [, setPlayersLoading] = useState(false);
  const [, setPlayersError] = useState<string | null>(null);

  const [, setIsGamesLoading] = useState(true);

  // Helper types for betting odds
  type BettingOddsResponse = {
    odds?: { awayTeamSpread?: string; homeTeamSpread?: string };
  };
  type ApiWrapped<T> = { success?: boolean; data?: T };

  // Helper maps for quick lookup
  const teamIdToTeam = new Map<string, ITeam>(teams.map((t) => [t.teamID, t]));

  // Join games with team details for UI convenience
  const joinedCurrentWeekGames = games
    .filter((g) => {
      if (currentWeek == null) return true;
      // Some seasons reset to Week 1; prefer deriving week from earliest upcoming or earliest present
      // gameWeek is a string like "Week 1"; ensure numeric match
      const weekNum = Number(g.gameWeek.match(/\d+/)?.[0] ?? NaN);
      return !Number.isNaN(weekNum) && weekNum === currentWeek;
    })
    .map((g) => {
      const homeTeam = teamIdToTeam.get(g.teamIDHome);
      const awayTeam = teamIdToTeam.get(g.teamIDAway);
      return {
        id: Number(g.gameID) || (g.gameID as unknown as number),
        raw: g,
        homeTeam,
        awayTeam,
        gameDate: g.gameDate,
        gameTime: g.gameTime,
      };
    });

  // Load teams and games (with simple SPA-lifetime memoization)
  useEffect(() => {
    let active = true;
    const cachedTeams = memCache.get<ITeam[]>("teams");
    const cachedGames = memCache.get<IGame[]>("games");
    if (cachedTeams && cachedGames) {
      setTeams(cachedTeams);
      setGames(cachedGames);
      setIsGamesLoading(false);
      const weekNums = cachedGames
        .map((g) => g.gameWeek)
        .map((w) => (typeof w === "string" ? w.match(/\d+/)?.[0] : undefined))
        .filter((n): n is string => Boolean(n))
        .map((n) => Number(n))
        .filter((n) => !Number.isNaN(n));
      if (weekNums.length) setCurrentWeek(Math.min(...weekNums));
      return () => {
        active = false;
      };
    }

    Promise.all([
      apiClient.get<{ success: boolean; data?: ITeam[] }>("teams"),
      apiClient.get<{ success: boolean; data?: IGame[] }>("games"),
    ])
      .then(([teamsRes, gamesRes]) => {
        if (!active) return;
        const teamList = Array.isArray(teamsRes.data) ? teamsRes.data : [];
        const gameList = Array.isArray(gamesRes.data) ? gamesRes.data : [];
        setTeams(teamList);
        setGames(gameList);
        memCache.set("teams", teamList);
        memCache.set("games", gameList);
        setIsGamesLoading(false);
        // Derive current week as the minimal week among games in the current season set
        const weekNums = gameList
          .map((g) => g.gameWeek)
          .map((w) => (typeof w === "string" ? w.match(/\d+/)?.[0] : undefined))
          .filter((n): n is string => Boolean(n))
          .map((n) => Number(n))
          .filter((n) => !Number.isNaN(n));
        if (weekNums.length) {
          setCurrentWeek(Math.min(...weekNums));
        }
      })
      .catch(() => {
        if (!active) return;
        setTeams([]);
        setGames([]);
      });
    return () => {
      active = false;
    };
  }, []);

  // Load existing picks if user has already submitted (placeholder, since mocks removed)
  useEffect(() => {
    // TODO: integrate with real user picks API when available
    setHasSubmitted(false);
  }, [currentUser]);

  // Fetch betting odds for games in current view
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const toFetch = joinedCurrentWeekGames
      .map((g) => g.raw.gameID)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
      .filter((id) => !oddsByGameId[id] && !memCache.get(`odds:${id}`));
    if (toFetch.length === 0) return;
    Promise.all(
      toFetch.map((gameId) =>
        apiClient
          .get<BettingOddsResponse | ApiWrapped<BettingOddsResponse>>(
            `betting-odds/${encodeURIComponent(gameId)}`,
            {
              signal: controller.signal,
            }
          )
          .then((res) => ({ gameId, res }))
          .catch(() => ({ gameId, res: undefined }))
      )
    ).then((results) => {
      if (!active) return;
      setOddsByGameId((prev) => {
        const next = { ...prev };
        for (const { gameId, res } of results) {
          if (!res) continue;
          // Handle both plain document and ApiResponse-wrapped
          const payload = res as
            | BettingOddsResponse
            | ApiWrapped<BettingOddsResponse>;
          let odds: BettingOddsResponse["odds"] | undefined;
          if (
            payload &&
            (payload as ApiWrapped<BettingOddsResponse>).data !== undefined
          ) {
            odds = (payload as ApiWrapped<BettingOddsResponse>).data?.odds;
          } else {
            odds = (payload as BettingOddsResponse).odds;
          }
          next[gameId] = {
            awayTeamSpread: odds?.awayTeamSpread,
            homeTeamSpread: odds?.homeTeamSpread,
          };
          memCache.set(`odds:${gameId}`, next[gameId]);
        }
        return next;
      });
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [joinedCurrentWeekGames, oddsByGameId]);

  const handlePickChange = (gameId: number, team: string) => {
    setPicks((prev) => ({
      ...prev,
      [gameId]: team,
    }));
  };

  const handleTouchdownScorerSelect = (
    playerId: string,
    playerName: string
  ) => {
    setTouchdownScorer(playerId);
    setPlayerSearchValue(playerName);
    setPlayerSearchOpen(false);
  };

  const parseGameDateTime = (gameDate: string, gameTime: string) => {
    // gameDate: "YYYYMMDD" (e.g., 20250904), gameTime: like "8:20p" or "1:00p"
    const yyyy = Number(gameDate.slice(0, 4));
    const mm = Number(gameDate.slice(4, 6));
    const dd = Number(gameDate.slice(6, 8));
    const timeMatch = gameTime
      .trim()
      .match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])/i);
    let hours = 12;
    let minutes = 0;
    if (timeMatch) {
      hours = Number(timeMatch[1]);
      minutes = timeMatch[2] ? Number(timeMatch[2]) : 0;
      const meridiem = timeMatch[3].toLowerCase();
      if (meridiem === "p" && hours !== 12) hours += 12;
      if (meridiem === "a" && hours === 12) hours = 0;
    }
    // Months are 0-based in JS Date
    return new Date(yyyy, mm - 1, dd, hours, minutes, 0, 0);
  };

  const formatGameTime = (gameDate: string, gameTime: string) => {
    const date = parseGameDateTime(gameDate, gameTime);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const isGameStarted = (gameDate: string, gameTime: string) => {
    return parseGameDateTime(gameDate, gameTime) <= new Date();
  };

  const canSubmit = () => {
    const requiredPicks = joinedCurrentWeekGames.length;
    const submittedPicks = Object.keys(picks).length;
    return (
      submittedPicks === requiredPicks &&
      lockOfWeek &&
      touchdownScorer &&
      propBet.trim() &&
      propBetOdds.trim()
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setHasSubmitted(true);
    setIsSubmitting(false);
  };

  // Fetch players from API with debounce; backend paginates to 20 per page and supports search
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const q = playerSearchValue.trim();
    setPlayersLoading(true);
    setPlayersError(null);
    const t = setTimeout(() => {
      apiClient
        .get<{ success: boolean; data?: { items: IPlayer[] } }>("players", {
          query: q ? { search: q } : undefined,
        })
        .then((res) => {
          if (!active) return;
          const list = Array.isArray(res.data?.items) ? res.data.items! : [];
          setPlayers(list);
        })
        .catch((err: unknown) => {
          if (!active) return;
          const msg =
            err instanceof Error ? err.message : "Failed to load players";
          setPlayersError(msg);
          setPlayers([]);
        })
        .finally(() => {
          if (!active) return;
          setPlayersLoading(false);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
      controller.abort();
    };
  }, [playerSearchValue]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Make Your Picks
          </h1>
          <p className="text-muted-foreground mt-1">
            Week {currentWeek ?? "-"} • {joinedCurrentWeekGames.length} games
          </p>
        </div>
        {hasSubmitted && (
          <Badge variant="default" className="text-sm">
            Picks Submitted
          </Badge>
        )}
      </div>

      {/* Spread Picks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Spread Picks
          </CardTitle>
          <CardDescription>
            Pick the winner against the spread for each game
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {joinedCurrentWeekGames.map((game) => {
              const gameStarted = isGameStarted(game.gameDate, game.gameTime);

              return (
                <div
                  key={game.id}
                  className={`p-4 border rounded-lg transition-all duration-200 hover:shadow-md ${
                    gameStarted ? "bg-muted/50" : "hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-muted-foreground">
                      {formatGameTime(game.gameDate, game.gameTime)}
                      {gameStarted && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Started
                        </Badge>
                      )}
                    </div>
                    {gameStarted && (
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="flex items-center gap-3 text-lg font-medium">
                      <div
                        className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                          picks[game.id] === game.awayTeam?.teamAbv
                            ? "bg-muted"
                            : ""
                        }`}
                      >
                        <img
                          src={game.awayTeam?.espnLogo1}
                          alt={`${game.awayTeam?.teamAbv} logo`}
                          className="w-6 h-6 rounded-full"
                        />
                        <span>{game.awayTeam?.teamAbv}</span>
                      </div>
                      <span className="text-muted-foreground">@</span>
                      <div
                        className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                          picks[game.id] === game.homeTeam?.teamAbv
                            ? "bg-muted"
                            : ""
                        }`}
                      >
                        <img
                          src={game.homeTeam?.espnLogo1}
                          alt={`${game.homeTeam?.teamAbv} logo`}
                          className="w-6 h-6 rounded-full"
                        />
                        <span>{game.homeTeam?.teamAbv}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      variant={
                        picks[game.id] === game.awayTeam?.teamAbv
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      className="flex-1 h-auto p-2 transition-all duration-200"
                      onClick={() =>
                        handlePickChange(
                          game.id,
                          (game.awayTeam?.teamAbv as string) || ""
                        )
                      }
                      disabled={gameStarted}
                      style={{
                        backgroundColor:
                          picks[game.id] === game.awayTeam?.teamAbv
                            ? "#22c55e"
                            : undefined,
                        color:
                          picks[game.id] === game.awayTeam?.teamAbv
                            ? "#ffffff"
                            : undefined,
                      }}
                      onMouseEnter={(e) => {
                        if (
                          !gameStarted &&
                          picks[game.id] !== game.awayTeam?.teamAbv
                        ) {
                          e.currentTarget.style.backgroundColor = "#00000010";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (
                          !gameStarted &&
                          picks[game.id] !== game.awayTeam?.teamAbv
                        ) {
                          e.currentTarget.style.backgroundColor = "";
                        }
                      }}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <img
                          src={game.awayTeam?.espnLogo1}
                          alt={`${game.awayTeam?.teamAbv} logo`}
                          className="w-6 h-6 rounded-full"
                        />
                        <div className="text-center">
                          <div className="font-semibold text-sm">
                            {game.awayTeam?.teamAbv}
                          </div>
                          <div className="text-xs opacity-80">
                            {oddsByGameId[game.raw.gameID]?.awayTeamSpread ||
                              "PK"}
                          </div>
                        </div>
                      </div>
                    </Button>
                    <Button
                      variant={
                        picks[game.id] === game.homeTeam?.teamAbv
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      className="flex-1 h-auto p-2 transition-all duration-200"
                      onClick={() =>
                        handlePickChange(
                          game.id,
                          (game.homeTeam?.teamAbv as string) || ""
                        )
                      }
                      disabled={gameStarted}
                      style={{
                        backgroundColor:
                          picks[game.id] === game.homeTeam?.teamAbv
                            ? "#22c55e"
                            : undefined,
                        color:
                          picks[game.id] === game.homeTeam?.teamAbv
                            ? "#ffffff"
                            : undefined,
                      }}
                      onMouseEnter={(e) => {
                        if (
                          !gameStarted &&
                          picks[game.id] !== game.homeTeam?.teamAbv
                        ) {
                          e.currentTarget.style.backgroundColor = "#00000010";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (
                          !gameStarted &&
                          picks[game.id] !== game.homeTeam?.teamAbv
                        ) {
                          e.currentTarget.style.backgroundColor = "";
                        }
                      }}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <img
                          src={game.homeTeam?.espnLogo1}
                          alt={`${game.homeTeam?.teamAbv} logo`}
                          className="w-6 h-6 rounded-full"
                        />
                        <div className="text-center">
                          <div className="font-semibold text-sm">
                            {game.homeTeam?.teamAbv}
                          </div>
                          <div className="text-xs opacity-80">
                            {oddsByGameId[game.raw.gameID]?.homeTeamSpread ||
                              "PK"}
                          </div>
                        </div>
                      </div>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Lock of the Week and Touchdown Scorer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lock of the Week */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Lock of the Week
            </CardTitle>
            <CardDescription>
              Choose your most confident pick for double points
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={lockOfWeek} onValueChange={setLockOfWeek}>
              <SelectTrigger>
                <SelectValue placeholder="Select your lock of the week" />
              </SelectTrigger>
              <SelectContent>
                {joinedCurrentWeekGames.map((game) => {
                  const userPick = picks[game.id];
                  if (!userPick) return null;

                  const selectedTeam =
                    game.awayTeam?.teamAbv === userPick
                      ? game.awayTeam
                      : game.homeTeam;

                  return (
                    <SelectItem key={game.id} value={`${game.id}-${userPick}`}>
                      <div className="flex items-center gap-2">
                        {selectedTeam?.espnLogo1 && (
                          <img
                            src={selectedTeam.espnLogo1}
                            alt={`${selectedTeam.teamAbv} logo`}
                            className="w-4 h-4 rounded-full"
                          />
                        )}
                        <span>{selectedTeam?.teamAbv}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Touchdown Scorer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Touchdown Scorer
            </CardTitle>
            <CardDescription>
              Pick a player to score a touchdown this week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Popover open={playerSearchOpen} onOpenChange={setPlayerSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={playerSearchOpen}
                  className="w-full justify-between"
                >
                  {playerSearchValue || "Search for a player..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput
                    placeholder="Search players..."
                    value={playerSearchValue}
                    onValueChange={setPlayerSearchValue}
                  />
                  <CommandList>
                    <CommandEmpty>No players found.</CommandEmpty>
                    <CommandGroup>
                      {players.slice(0, 20).map((player) => {
                        return (
                          <CommandItem
                            key={player.playerID}
                            value={player.longName}
                            className="flex justify-between items-center"
                            onSelect={() =>
                              handleTouchdownScorerSelect(
                                player.playerID,
                                player.longName as string
                              )
                            }
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                touchdownScorer === String(player.playerID)
                                  ? "opacity-100"
                                  : "opacity-0"
                              }`}
                            />
                            <div className="flex items-center justify-start w-full">
                              <div className="flex justify-start items-center w-full gap-2">
                                {player.espnHeadshot && (
                                  <img
                                    src={player.espnHeadshot}
                                    alt={`${player.longName} headshot`}
                                    className="w-5 h-5 rounded-full object-cover"
                                  />
                                )}

                                <span className="text-sm w-full">
                                  {player.longName}
                                </span>

                                <div className="flex gap-2 font-medium w-[20%] justify-end">
                                  <span className="text-sm">{player.team}</span>
                                  <span className="text-sm">{player.pos}</span>
                                </div>
                              </div>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>
      </div>

      {/* Prop Bet */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Prop Bet
          </CardTitle>
          <CardDescription>
            Submit a prop bet for admin approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="propBet">Prop Bet Description</Label>
            <Input
              id="propBet"
              placeholder="e.g., Over 250.5 passing yards - Patrick Mahomes"
              value={propBet}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPropBet(e.target.value)
              }
            />
            <Label htmlFor="propBetOdds">Prop Bet Odds</Label>
            <Input
              id="propBetOdds"
              placeholder="e.g., +190"
              value={propBetOdds}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPropBetOdds(e.target.value)
              }
            />
            <p className="text-xs text-muted-foreground">
              Describe your prop bet clearly and provide the odds (e.g., +190,
              -150).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit() || isSubmitting}
          size="lg"
          className="min-w-32"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Submitting...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {hasSubmitted ? "Update Picks" : "Submit Picks"}
            </>
          )}
        </Button>
      </div>

      {/* Progress Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>
                {Object.keys(picks).length}/{joinedCurrentWeekGames.length}{" "}
                games
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    (Object.keys(picks).length /
                      (joinedCurrentWeekGames.length || 1)) *
                    100
                  }%`,
                }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Spread picks: {Object.keys(picks).length > 0 ? "✓" : "○"}
              </span>
              <span>Lock of week: {lockOfWeek ? "✓" : "○"}</span>
              <span>TD scorer: {touchdownScorer ? "✓" : "○"}</span>
              <span>
                Prop bet: {propBet.trim() && propBetOdds.trim() ? "✓" : "○"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Picks;
