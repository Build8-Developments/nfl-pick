import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import type { IPlayer } from "@/types/player.type";
import type { IGame } from "@/types/game.type";
import type { ITeam } from "@/types/team.type";
import { memCache } from "@/lib/memCache";

const Picks = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [lockOfWeek, setLockOfWeek] = useState("");
  const [touchdownScorer, setTouchdownScorer] = useState("");
  const [propBet, setPropBet] = useState("");
  const [propBetOdds, setPropBetOdds] = useState("");
  const [propBetStatus, setPropBetStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [playerSearchOpen, setPlayerSearchOpen] = useState(false);
  const [playerSearchValue, setPlayerSearchValue] = useState("");
  const [players, setPlayers] = useState<IPlayer[]>([]);
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [games, setGames] = useState<IGame[]>([]);
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);
  const [oddsByGameId, setOddsByGameId] = useState<
    Record<string, { awayTeamSpread?: string; homeTeamSpread?: string }>
  >({});
  const [, setPlayersLoading] = useState(false);
  const [, setPlayersError] = useState<string | null>(null);
  const [, setIsGamesLoading] = useState(true);
  const [usedTdScorers, setUsedTdScorers] = useState<string[]>([]);
  const isHydratingRef = useRef(false);

  type BettingOddsResponse = {
    odds?: { awayTeamSpread?: string; homeTeamSpread?: string };
  };
  type ApiWrapped<T> = { success?: boolean; data?: T };

  const parseGameDateTime = (gameDate: string, gameTime: string) => {
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
    return new Date(yyyy, mm - 1, dd, hours, minutes, 0, 0);
  };

  const teamIdToTeam = useMemo(() => {
    return new Map<string, ITeam>(teams.map((t) => [t.teamID, t]));
  }, [teams]);

  const joinedCurrentWeekGames = useMemo(() => {
    return games
      .filter((g) => {
        if (selectedWeek == null) return true;
        const weekNum = Number(g.gameWeek.match(/\d+/)?.[0] ?? NaN);
        return !Number.isNaN(weekNum) && weekNum === selectedWeek;
      })
      .map((g) => {
        const homeTeam = teamIdToTeam.get(g.teamIDHome);
        const awayTeam = teamIdToTeam.get(g.teamIDAway);
        return {
          id: String(g.gameID),
          raw: g,
          homeTeam,
          awayTeam,
          gameDate: g.gameDate,
          gameTime: g.gameTime,
        };
      })
      .filter((g) => g.homeTeam && g.awayTeam)
      .sort((a, b) => {
        // Sort by game date and time
        const dateA = parseGameDateTime(a.gameDate, a.gameTime);
        const dateB = parseGameDateTime(b.gameDate, b.gameTime);
        return dateA.getTime() - dateB.getTime();
      });
  }, [games, teamIdToTeam, selectedWeek]);

  // Load used TD scorers for the current user
  useEffect(() => {
    if (!currentUser) return;
    let active = true;

    apiClient
      .get<{
        success: boolean;
        data?: string[];
      }>("picks/used-td-scorers")
      .then((res) => {
        if (!active) return;
        const usedScorers = res?.data || [];
        setUsedTdScorers(usedScorers);
      })
      .catch((err) => {
        console.error("[PICKS] Error loading used TD scorers:", err);
        setUsedTdScorers([]);
      });

    return () => {
      active = false;
    };
  }, [currentUser]);

  // Load user's saved picks for selectedWeek
  useEffect(() => {
    if (!currentUser || !selectedWeek) return;
    let active = true;
    isHydratingRef.current = true;
    apiClient
      .get<{
        success: boolean;
        data?: {
          selections?: Record<string, string>;
          lockOfWeek?: string;
          touchdownScorer?: string;
          propBet?: string;
          propBetOdds?: string;
          propBetStatus?: string;
          isFinalized?: boolean;
        } | null;
      }>(`picks/${selectedWeek}`)
      .then((res) => {
        if (!active) return;
        const data = res?.data;
        if (data) {
          const selections = (data.selections || {}) as Record<string, string>;
          setPicks(selections);
          setLockOfWeek(data.lockOfWeek || "");
          setTouchdownScorer(data.touchdownScorer || "");
          setPropBet(data.propBet || "");
          setPropBetOdds(data.propBetOdds || "");
          setPropBetStatus(data.propBetStatus || null);
          setHasSubmitted(Boolean(data.isFinalized));
        } else {
          setPicks({});
          setLockOfWeek("");
          setTouchdownScorer("");
          setPropBet("");
          setPropBetOdds("");
          setPropBetStatus(null);
          setHasSubmitted(false);
        }
      })
      .catch(() => {
        setPicks({});
        setHasSubmitted(false);
      })
      .finally(() => {
        // allow a tick to avoid immediate autosave right after hydration
        setTimeout(() => {
          isHydratingRef.current = false;
        }, 0);
      });
    return () => {
      active = false;
    };
  }, [currentUser, selectedWeek]);

  // Autosave removed: only explicit submit persists

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

      if (weekNums.length) {
        const uniqueWeeks = [...new Set(weekNums)].sort((a, b) => a - b);
        setAvailableWeeks(uniqueWeeks);
        // Determine the most relevant week (current/upcoming if possible)
        const now = new Date();
        const weeksWithKickoffs = uniqueWeeks.map((wk) => {
          const gamesForWeek = cachedGames.filter((g: IGame) => {
            const num = Number((g.gameWeek || "").match(/\d+/)?.[0] ?? NaN);
            return !Number.isNaN(num) && num === wk;
          });
          const firstUpcoming = gamesForWeek.some((g) => {
            const dt = parseGameDateTime(
              g.gameDate as string,
              g.gameTime as string
            );
            return now <= new Date(dt.getTime() + 15 * 60 * 1000);
          });
          return { wk, hasUpcoming: firstUpcoming };
        });
        const upcoming = weeksWithKickoffs.find((w) => w.hasUpcoming)?.wk;
        const chosen = upcoming ?? Math.max(...uniqueWeeks);
        setCurrentWeek(chosen);
        setSelectedWeek(chosen);
      }
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
        const weekNums = gameList
          .map((g) => g.gameWeek)
          .map((w) => (typeof w === "string" ? w.match(/\d+/)?.[0] : undefined))
          .filter((n): n is string => Boolean(n))
          .map((n) => Number(n))
          .filter((n) => !Number.isNaN(n));

        if (weekNums.length) {
          const uniqueWeeks = [...new Set(weekNums)].sort((a, b) => a - b);
          setAvailableWeeks(uniqueWeeks);
          // Determine the most relevant week (current/upcoming if possible)
          const now = new Date();
          const weeksWithKickoffs = uniqueWeeks.map((wk) => {
            const gamesForWeek = gameList.filter((g: IGame) => {
              const num = Number((g.gameWeek || "").match(/\d+/)?.[0] ?? NaN);
              return !Number.isNaN(num) && num === wk;
            });
            const firstUpcoming = gamesForWeek.some((g) => {
              const dt = parseGameDateTime(
                g.gameDate as string,
                g.gameTime as string
              );
              return now <= new Date(dt.getTime() + 15 * 60 * 1000);
            });
            return { wk, hasUpcoming: firstUpcoming };
          });
          const upcoming = weeksWithKickoffs.find((w) => w.hasUpcoming)?.wk;
          const chosen = upcoming ?? Math.max(...uniqueWeeks);
          setCurrentWeek(chosen);
          setSelectedWeek(chosen);
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

  useEffect(() => {
    setHasSubmitted(false);
  }, [currentUser]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const toFetch = joinedCurrentWeekGames
      .map((g) => g.raw.gameID)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
      .filter((id) => !memCache.get(`odds:${id}`));

    if (toFetch.length === 0) return;

    const processRequestsWithDelay = async () => {
      const results: Array<{
        gameId: string;
        res?: BettingOddsResponse | ApiWrapped<BettingOddsResponse> | undefined;
      }> = [];

      for (let i = 0; i < toFetch.length; i++) {
        if (!active) break;

        const gameId = toFetch[i];
        try {
          const res = await apiClient.get<
            BettingOddsResponse | ApiWrapped<BettingOddsResponse>
          >(`betting-odds/${encodeURIComponent(gameId)}`, {
            signal: controller.signal,
          });
          results.push({ gameId, res });
        } catch {
          results.push({ gameId, res: undefined });
        }

        if (i < toFetch.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      if (!active) return;

      setOddsByGameId((prev) => {
        const next = { ...prev };
        for (const { gameId, res } of results) {
          if (!res) continue;
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
    };

    processRequestsWithDelay();

    return () => {
      active = false;
      controller.abort();
    };
  }, [joinedCurrentWeekGames]);

  const handlePickChange = (gameId: string, team: string) => {
    if (!canEditPicks()) return;
    setPicks((prev) => {
      // If clicking the same team that's already selected, deselect it
      if (prev[gameId] === team) {
        const newPicks = { ...prev };
        delete newPicks[gameId];
        return newPicks;
      }
      // Otherwise, select the team
      return {
        ...prev,
        [gameId]: team,
      };
    });
  };

  const handleTouchdownScorerSelect = (
    playerId: string,
    playerName: string
  ) => {
    if (!canEditPicks()) return;
    // Remove client-side validation - let the server handle it based on week timing
    setTouchdownScorer(playerId);
    setPlayerSearchValue(playerName);
    setPlayerSearchOpen(false);
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
    const gameDateTime = parseGameDateTime(gameDate, gameTime);
    const now = new Date();
    const bufferMinutes = 15;
    const cutoffTime = new Date(
      gameDateTime.getTime() + bufferMinutes * 60 * 1000
    );
    return now > cutoffTime;
  };

  const canEditGame = (gameDate: string, gameTime: string) => {
    const gameDateTime = parseGameDateTime(gameDate, gameTime);
    const now = new Date();
    const lockoutMinutes = 10;
    const lockoutTime = new Date(
      gameDateTime.getTime() - lockoutMinutes * 60 * 1000
    );
    return now <= lockoutTime;
  };

  const canEditPicks = () => {
    if (!selectedWeek || !games.length) return true;

    const currentWeekGames = games.filter((g) => {
      const weekNum = Number(g.gameWeek.match(/\d+/)?.[0] ?? NaN);
      return !Number.isNaN(weekNum) && weekNum === selectedWeek;
    });

    if (currentWeekGames.length === 0) return true;

    // Check if ALL games in the week have been completed
    const allGamesCompleted = currentWeekGames.every((g) => {
      return isGameStarted(g.gameDate as string, g.gameTime as string);
    });

    // If all games are completed, picks are locked
    if (allGamesCompleted) return false;

    // For individual games, check if they can still be edited (10 minutes before kickoff)
    // This will be handled in the UI by disabling individual game buttons
    return true;
  };

  const canSubmit = () => canEditPicks();

  const handleSubmit = async () => {
    const weekToSave = selectedWeek ?? currentWeek;
    if (!currentUser || !weekToSave) return;
    if (!canSubmit()) return;
    setIsSubmitting(true);

    const selections: Record<string, string> = { ...picks };

    // Debug: print the exact payload being sent
    const payload = {
      week: weekToSave,
      selections,
      lockOfWeek,
      touchdownScorer,
      propBet,
      propBetOdds,
      isFinalized: true,
    };

    try {
      await apiClient.post<{
        success?: boolean;
        data?: unknown;
        message?: string;
      }>("picks", payload);
      setHasSubmitted(true);
      // Clear all fields after submit
      setPicks({});
      setLockOfWeek("");
      setTouchdownScorer("");
      setPropBet("");
      setPropBetOdds("");
      navigate("/live-picks");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[PICKS] Submit failed:", message);
      try {
        if (message.includes("locked for this week")) {
          alert(`Picks are locked: ${message}`);
        } else {
          alert(`Submit failed: ${message}`);
        }
      } catch {
        /* noop */
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Draft save/delete removed

  // players fetch effect remains
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const q = playerSearchValue.trim();
    if (!playerSearchOpen || q.length < 2) {
      setPlayers([]);
      return () => {
        active = false;
        controller.abort();
      };
    }
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
        .catch(() => {
          if (!active) return;
          setPlayersError("Failed to load players");
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
  }, [playerSearchOpen, playerSearchValue]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Make Your Picks
          </h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-muted-foreground">
              Week {selectedWeek ?? "-"} •{" "}
              {
                joinedCurrentWeekGames.filter((g) =>
                  canEditGame(g.gameDate, g.gameTime)
                ).length
              }{" "}
              games available
            </p>
            {!canEditPicks() && (
              <Badge variant="destructive" className="text-sm">
                Picks Locked
              </Badge>
            )}
            {availableWeeks.length > 1 && (
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="week-selector"
                  className="text-sm text-muted-foreground"
                >
                  Select Week:
                </Label>
                <Select
                  value={selectedWeek?.toString() || ""}
                  onValueChange={(value) => setSelectedWeek(Number(value))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Week" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableWeeks.map((week) => (
                      <SelectItem key={week} value={week.toString()}>
                        Week {week}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
        {hasSubmitted && canEditPicks() && (
          <Badge variant="default" className="text-sm">
            Picks Submitted - Can Edit
          </Badge>
        )}
        {hasSubmitted && !canEditPicks() && (
          <Badge variant="destructive" className="text-sm">
            Picks Locked
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
              const canEdit =
                canEditPicks() && canEditGame(game.gameDate, game.gameTime);

              return (
                <div
                  key={game.id}
                  className={`p-4 border rounded-lg transition-all duration-200 hover:shadow-md ${
                    gameStarted || !canEdit
                      ? "bg-muted/50 opacity-60"
                      : "hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-muted-foreground">
                      {formatGameTime(game.gameDate, game.gameTime)}
                      {gameStarted ? (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Completed
                        </Badge>
                      ) : !canEdit ? (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          Locked
                        </Badge>
                      ) : (
                        <Badge variant="default" className="ml-2 text-xs">
                          Available
                        </Badge>
                      )}
                    </div>
                    {!canEdit && (
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
                      disabled={gameStarted || !canEdit}
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
                          canEdit &&
                          picks[game.id] !== game.awayTeam?.teamAbv
                        ) {
                          e.currentTarget.style.backgroundColor = "#00000010";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (
                          !gameStarted &&
                          canEdit &&
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
                              "LOADING ..."}
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
                      disabled={gameStarted || !canEdit}
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
                          canEdit &&
                          picks[game.id] !== game.homeTeam?.teamAbv
                        ) {
                          e.currentTarget.style.backgroundColor = "#00000010";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (
                          !gameStarted &&
                          canEdit &&
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
                              "LOADING ..."}
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
          <CardContent className={!canEditPicks() ? "opacity-60" : undefined}>
            <Select
              value={lockOfWeek}
              onValueChange={(v) => {
                if (!canEditPicks()) return;
                setLockOfWeek(v);
              }}
            >
              <SelectTrigger disabled={!canEditPicks()}>
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
                    <SelectItem
                      key={game.id}
                      value={selectedTeam?.teamAbv || ""}
                    >
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
          <CardContent className={!canEditPicks() ? "opacity-60" : undefined}>
            <Popover
              open={playerSearchOpen}
              onOpenChange={(open) => {
                if (!canEditPicks()) return;
                setPlayerSearchOpen(open);
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={playerSearchOpen}
                  className="w-full justify-between"
                  disabled={!canEditPicks()}
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
                        const isUsed = usedTdScorers.includes(
                          String(player.playerID)
                        );
                        const isSelected =
                          touchdownScorer === String(player.playerID);

                        return (
                          <CommandItem
                            key={player.playerID}
                            value={player.longName}
                            className={`flex justify-between items-center ${
                              isUsed && !isSelected ? "opacity-75" : ""
                            }`}
                            onSelect={() => {
                              // Allow re-selecting the same player for the same week
                              // The server will handle the actual validation based on week timing
                              handleTouchdownScorerSelect(
                                player.playerID,
                                player.longName as string
                              );
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                isSelected ? "opacity-100" : "opacity-0"
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

                                <span
                                  className={`text-sm w-full ${
                                    isUsed && !isSelected ? "line-through" : ""
                                  }`}
                                >
                                  {player.longName}
                                  {isUsed && !isSelected && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      (Used this season)
                                    </span>
                                  )}
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
        <CardContent className={!canEditPicks() ? "opacity-60" : undefined}>
          {/* Prop Bet Status Indicator */}
          {propBet && propBetStatus && (
            <div
              className={`mb-4 p-3 rounded-lg border ${
                propBetStatus === "approved"
                  ? "bg-green-50 border-green-200"
                  : propBetStatus === "rejected"
                  ? "bg-red-50 border-red-200"
                  : "bg-yellow-50 border-yellow-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {propBetStatus === "approved" ? (
                  <>
                    <Check className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">
                      Prop Bet Approved!
                    </span>
                  </>
                ) : propBetStatus === "rejected" ? (
                  <>
                    <X className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-800">
                      Prop Bet Rejected
                    </span>
                  </>
                ) : (
                  <>
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">
                      Prop Bet Pending Approval
                    </span>
                  </>
                )}
              </div>
              <p className="text-sm mt-1 text-muted-foreground">
                "{propBet}"{" "}
                {propBetStatus === "pending"
                  ? "is waiting for admin review"
                  : propBetStatus === "approved"
                  ? "has been approved and is now live"
                  : "was rejected by admin"}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="propBet">Prop Bet Description</Label>
            <Input
              id="propBet"
              placeholder="e.g., Over 250.5 passing yards - Patrick Mahomes"
              value={propBet}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPropBet(e.target.value)
              }
              disabled={!canEditPicks()}
            />
            <Label htmlFor="propBetOdds">Prop Bet Odds</Label>
            <Input
              id="propBetOdds"
              placeholder="e.g., +190"
              value={propBetOdds}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPropBetOdds(e.target.value)
              }
              disabled={!canEditPicks()}
            />
            <p className="text-xs text-muted-foreground">
              Describe your prop bet clearly and provide the odds (e.g., +190,
              -150). Your prop bet will be reviewed by an admin before going
              live.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex gap-2 justify-end">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !canSubmit()}
          size="lg"
          className="min-w-32"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {hasSubmitted ? "Updating..." : "Submitting..."}
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {hasSubmitted ? "Update Picks" : "Submit Picks"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Picks;
