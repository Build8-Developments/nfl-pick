import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [selectedTdPlayerName, setSelectedTdPlayerName] = useState<string>("");
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

  // Calculate current NFL week based on season start date
  const getCurrentSeason = () => {
    const now = new Date();
    // NFL season mostly spans Sep-Feb, use year of September for season label
    return now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  };

  const getSeasonStartDate = (season: number) => {
    // NFL season typically starts on the first Thursday of September
    const september = new Date(season, 8, 1); // September 1st
    const dayOfWeek = september.getDay(); // 0 = Sunday, 1 = Monday, ..., 4 = Thursday
    const daysToThursday = (4 - dayOfWeek + 7) % 7;
    const firstThursday = new Date(
      september.getTime() + daysToThursday * 24 * 60 * 60 * 1000
    );
    return firstThursday;
  };

  const computeCurrentWeek = useCallback((season: number) => {
    const start = getSeasonStartDate(season);
    const now = new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const diffWeeks = Math.floor((now.getTime() - start.getTime()) / msPerWeek);
    // Week indexing starts at 1; clamp between 1 and 18 for regular season
    return Math.min(Math.max(diffWeeks + 1, 1), 18);
  }, []);

  // Helper function to determine if a date is in Eastern Daylight Time
  const isEasternDaylightTime = useCallback((date: Date) => {
    // DST in the US typically runs from second Sunday in March to first Sunday in November
    const year = date.getFullYear();

    // Second Sunday in March
    const marchSecondSunday = new Date(year, 2, 1); // March 1st
    const marchDayOfWeek = marchSecondSunday.getDay();
    const daysToSecondSunday = ((7 - marchDayOfWeek + 7) % 7) + 7; // Second Sunday
    marchSecondSunday.setDate(1 + daysToSecondSunday);

    // First Sunday in November
    const novemberFirstSunday = new Date(year, 10, 1); // November 1st
    const novemberDayOfWeek = novemberFirstSunday.getDay();
    const daysToFirstSunday = (7 - novemberDayOfWeek) % 7;
    novemberFirstSunday.setDate(1 + daysToFirstSunday);

    return date >= marchSecondSunday && date < novemberFirstSunday;
  }, []);

  const parseGameDateTime = useCallback(
    (gameDate: string, gameTime: string) => {
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

      // Create date in EST/EDT timezone
      // NFL games are scheduled in Eastern Time (EST/EDT)
      const estDate = new Date(yyyy, mm - 1, dd, hours, minutes, 0, 0);

      // Convert to UTC by adjusting for Eastern timezone offset
      // EST is UTC-5, EDT is UTC-4
      // We need to determine if it's EST or EDT based on the date
      const isDST = isEasternDaylightTime(estDate);
      const offsetHours = isDST ? 4 : 5; // EDT is UTC-4, EST is UTC-5

      // Create the actual game time in UTC
      const utcGameTime = new Date(
        estDate.getTime() + offsetHours * 60 * 60 * 1000
      );

      return utcGameTime;
    },
    [isEasternDaylightTime]
  );

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
  }, [games, teamIdToTeam, selectedWeek, parseGameDateTime]);

  const getGameStatus = (game: IGame) => {
    const statusRaw = (game.gameStatus || "").toLowerCase();
    if (statusRaw) {
      if (
        statusRaw.includes("final") ||
        statusRaw.includes("completed") ||
        statusRaw.includes("finished")
      )
        return "completed" as const;
      if (
        statusRaw.includes("in_progress") ||
        statusRaw.includes("live") ||
        statusRaw.includes("active")
      )
        return "in_progress" as const;
      if (
        statusRaw.includes("scheduled") ||
        statusRaw.includes("upcoming") ||
        statusRaw.includes("pre")
      )
        return "scheduled" as const;
    }
    const now = new Date(); // Current UTC time
    const dt = parseGameDateTime(
      game.gameDate as string,
      game.gameTime as string
    );
    if (dt > now) return "scheduled" as const;
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    if (dt > fourHoursAgo) return "in_progress" as const;
    return "completed" as const;
  };

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
          touchdownScorerName?: string;
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
          setSelectedTdPlayerName(data.touchdownScorerName || "");
          setPlayerSearchValue(data.touchdownScorerName || "");
          setPropBet(data.propBet || "");
          setPropBetOdds(data.propBetOdds || "");
          setPropBetStatus(data.propBetStatus || null);
          setHasSubmitted(Boolean(data.isFinalized));
        } else {
          setPicks({});
          setLockOfWeek("");
          setTouchdownScorer("");
          setSelectedTdPlayerName("");
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

        // Calculate the actual current NFL week
        const currentSeason = getCurrentSeason();
        const computedCurrentWeek = computeCurrentWeek(currentSeason);

        // Default to computed current week, but respect URL week param if valid
        const urlWeek = Number(searchParams.get("week") || NaN);
        const isUrlWeekValid =
          Number.isFinite(urlWeek) && uniqueWeeks.includes(urlWeek);

        // Use URL week if valid, otherwise default to computed current week (or first available week if current week doesn't exist)
        const defaultWeek = uniqueWeeks.includes(computedCurrentWeek)
          ? computedCurrentWeek
          : uniqueWeeks[0] || 1;
        const initial = isUrlWeekValid ? urlWeek : defaultWeek;

        setCurrentWeek(initial);
        setSelectedWeek(initial);
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

          // Calculate the actual current NFL week
          const currentSeason = getCurrentSeason();
          const computedCurrentWeek = computeCurrentWeek(currentSeason);

          // Default to computed current week, but respect URL week param if valid
          const urlWeek = Number(searchParams.get("week") || NaN);
          const isUrlWeekValid =
            Number.isFinite(urlWeek) && uniqueWeeks.includes(urlWeek);

          // Use URL week if valid, otherwise default to computed current week (or first available week if current week doesn't exist)
          const defaultWeek = uniqueWeeks.includes(computedCurrentWeek)
            ? computedCurrentWeek
            : uniqueWeeks[0] || 1;
          const initial = isUrlWeekValid ? urlWeek : defaultWeek;

          setCurrentWeek(initial);
          setSelectedWeek(initial);
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
  }, [computeCurrentWeek, searchParams]);

  // Keep URL week in sync when selection changes after initial load
  useEffect(() => {
    if (!selectedWeek) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("week", String(selectedWeek));
      return next;
    });
  }, [selectedWeek, setSearchParams]);

  useEffect(() => {
    setHasSubmitted(false);
  }, [currentUser]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const allIds = joinedCurrentWeekGames
      .map((g) => g.raw.gameID)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    if (allIds.length === 0) return;

    // Load from cache immediately
    const cached: Record<string, { awayTeamSpread?: string; homeTeamSpread?: string }> = {};
    const missing: string[] = [];
    for (const id of allIds) {
      const c = memCache.get(`odds:${id}`) as
        | { awayTeamSpread?: string; homeTeamSpread?: string }
        | undefined;
      if (c) {
        cached[id] = c;
      } else {
        missing.push(id);
      }
    }
    if (Object.keys(cached).length) {
      setOddsByGameId((prev) => ({ ...cached, ...prev }));
    }

    if (missing.length === 0) return;

    const fetchBatch = async () => {
      try {
        const res = await apiClient.post<
          | { oddsByGameId: Record<string, any> }
          | { success: boolean; data?: { oddsByGameId: Record<string, any> } }
        >(
          "betting-odds/batch",
          { gameIds: missing },
          { signal: controller.signal }
        );

        const payload = res as
          | { oddsByGameId: Record<string, any> }
          | { success: boolean; data?: { oddsByGameId: Record<string, any> } };
        const oddsByGameIdResp = (payload as any).oddsByGameId || (payload as any).data?.oddsByGameId || {};

        setOddsByGameId((prev) => {
          const next = { ...prev } as Record<string, { awayTeamSpread?: string; homeTeamSpread?: string }>;
          for (const [gid, odds] of Object.entries(oddsByGameIdResp || {})) {
            const awayTeamSpread = (odds as any)?.odds?.awayTeamSpread ?? (odds as any)?.awayTeamSpread;
            const homeTeamSpread = (odds as any)?.odds?.homeTeamSpread ?? (odds as any)?.homeTeamSpread;
            next[gid] = { awayTeamSpread, homeTeamSpread };
            memCache.set(`odds:${gid}`, next[gid]);
          }
          return next;
        });
      } catch {
        // ignore
      }
    };

    fetchBatch();

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
    setSelectedTdPlayerName(playerName);
    setPlayerSearchOpen(false);
  };

  const formatGameTime = (gameDate: string, gameTime: string) => {
    const date = parseGameDateTime(gameDate, gameTime);

    // Convert UTC time back to Eastern time for display
    const estDate = new Date(
      date.getTime() - (isEasternDaylightTime(date) ? 4 : 5) * 60 * 60 * 1000
    );

    const timezone = isEasternDaylightTime(date) ? "EDT" : "EST";

    return (
      estDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York", // This ensures proper EST/EDT handling
      }) + ` ${timezone}`
    );
  };

  const isGameStarted = (gameDate: string, gameTime: string) => {
    const gameDateTime = parseGameDateTime(gameDate, gameTime);
    const now = new Date(); // Current UTC time
    const bufferMinutes = 15;
    const cutoffTime = new Date(
      gameDateTime.getTime() + bufferMinutes * 60 * 1000
    );
    return now > cutoffTime;
  };

  const canEditGame = (gameDate: string, gameTime: string) => {
    const gameDateTime = parseGameDateTime(gameDate, gameTime);
    const now = new Date(); // Current UTC time
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
      return getGameStatus(g) === "completed";
    });

    // If all games are completed, picks are locked
    if (allGamesCompleted) return false;

    // For individual games, check if they can still be edited (10 minutes before kickoff)
    // This will be handled in the UI by disabling individual game buttons
    return true;
  };

  const canSubmit = () => {
    if (!selectedWeek || !games.length) return false;

    const currentWeekGames = games.filter((g) => {
      const weekNum = Number(g.gameWeek.match(/\d+/)?.[0] ?? NaN);
      return !Number.isNaN(weekNum) && weekNum === selectedWeek;
    });

    if (currentWeekGames.length === 0) return false;

    // Check if ALL games in the week have been completed
    const allGamesCompleted = currentWeekGames.every((g) => {
      return getGameStatus(g) === "completed";
    });

    // If all games are completed, picks are locked
    if (allGamesCompleted) return false;

    // Allow submission if there's at least one available game
    const hasAvailableGames = currentWeekGames.some((g) => {
      return (
        getGameStatus(g) !== "completed" && canEditGame(g.gameDate, g.gameTime)
      );
    });

    return hasAvailableGames;
  };

  const handleSubmit = async () => {
    const weekToSave = selectedWeek ?? currentWeek;
    if (!currentUser || !weekToSave) return;

    // Build a selections object including only games that are still editable (not started / before lockout)
    const currentWeekGames = games.filter((g) => {
      const weekNum = Number(g.gameWeek.match(/\d+/)?.[0] ?? NaN);
      return !Number.isNaN(weekNum) && weekNum === weekToSave;
    });

    const editableGameIds = new Set(
      currentWeekGames
        .filter((g) => getGameStatus(g as IGame) !== "completed" && canEditGame(g.gameDate, g.gameTime))
        .map((g) => String(g.gameID))
    );

    const selectionsFiltered: Record<string, string> = {};
    for (const [gid, team] of Object.entries(picks)) {
      if (editableGameIds.has(String(gid))) {
        selectionsFiltered[String(gid)] = team as string;
      }
    }

    if (!canSubmit()) return;
    setIsSubmitting(true);

    // Submit only editable selections
    const selections: Record<string, string> = { ...selectionsFiltered };

    // Only send lockOfWeek if it refers to one of the submitted selections (prevents server rejection)
    const selectedTeamsSet = new Set(Object.values(selections));
    const lockOfWeekToSend = lockOfWeek && selectedTeamsSet.has(lockOfWeek) ? lockOfWeek : undefined;

    // Debug: print the exact payload being sent
    const payload = {
      week: weekToSave,
      selections,
      ...(lockOfWeekToSend ? { lockOfWeek: lockOfWeekToSend } : {}),
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

  // Hydrate saved touchdownScorer name if only ID is present
  useEffect(() => {
    const id = touchdownScorer?.trim();
    if (!id) return;
    if (selectedTdPlayerName && selectedTdPlayerName.trim().length > 0) return;

    let active = true;
    apiClient
      .get<{ success: boolean; data?: IPlayer }>(`players/${id}`)
      .then((res) => {
        if (!active) return;
        const name = res?.data?.longName || "";
        if (name) {
          setSelectedTdPlayerName(name);
          setPlayerSearchValue(name);
        }
      })
      .catch(() => {})
      .finally(() => {
        // noop
      });

    return () => {
      active = false;
    };
  }, [touchdownScorer, selectedTdPlayerName]);

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
                  onValueChange={(value) => {
                    const n = Number(value);
                    setSelectedWeek(n);
                    if (Number.isFinite(n)) {
                      setSearchParams((prev) => {
                        const next = new URLSearchParams(prev);
                        next.set("week", String(n));
                        return next;
                      });
                    }
                  }}
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
              const status = getGameStatus(game.raw as IGame);
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
                      {status === "completed" ? (
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
                  {playerSearchValue || selectedTdPlayerName || "Search for a player..."}
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
      <div className="flex flex-col gap-2 items-end">
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
