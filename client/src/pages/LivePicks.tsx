import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  AlertTriangle,
  Check,
  X,
  Target,
  Lock,
  TrendingUp,
  Clock,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { computeAvatarUrl } from "@/lib/avatarUtils";
import type { ITeam } from "@/types/team.type";
import type { IPlayer } from "@/types/player.type";
import type { IGame } from "@/types/game.type";
import { memCache } from "@/lib/memCache";
import { useAuth } from "../contexts/useAuth";

const LivePicks = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("spreads");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [players, setPlayers] = useState<IPlayer[]>([]);
  const [games, setGames] = useState<IGame[]>([]);
  const [loading, setLoading] = useState(true);
  type BackendPick = {
    _id: string;
    user: { _id: string; username: string; avatar: string } | string;
    week: number;
    selections: Record<string, string>;
    outcomes?: Record<string, boolean | null>;
    lockOfWeek?: string;
    touchdownScorer?: string;
    propBet?: string;
    propBetOdds?: string;
    isFinalized?: boolean;
    createdAt?: string;
    updatedAt?: string;
    status?: string;
    propBetStatus?: string;
    propBetResolved?: boolean;
    propBetCorrect?: boolean;
    propBetApprovedAt?: string;
    propBetApprovedBy?: string;
    propBetRejectedAt?: string;
    propBetRejectedBy?: string;
    propBetSubmittedAt?: string;
    propBetSubmittedBy?: string;
  };
  const [allPicks, setAllPicks] = useState<BackendPick[]>([]);
  const [currentUserPicks, setCurrentUserPicks] = useState<BackendPick | null>(
    null
  );
  const [hasCurrentUserSubmitted, setHasCurrentUserSubmitted] = useState(false);
  const [oddsByGameId, setOddsByGameId] = useState<
    Record<string, { awayTeamSpread?: string; homeTeamSpread?: string }>
  >({});
  const isFetchingRef = useRef(false);
  const lastFetchAtRef = useRef(0);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
    }
  }, [currentUser, navigate]);

  const parseGameDateTime = (gameDate: string, gameTime: string) => {
    const yyyy = Number(gameDate.slice(0, 4));
    const mm = Number(gameDate.slice(4, 6));
    const dd = Number(gameDate.slice(6, 8));
    const m = gameTime.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])/i);
    let hours = 12;
    let minutes = 0;
    if (m) {
      hours = Number(m[1]);
      minutes = m[2] ? Number(m[2]) : 0;
      const meridiem = (m?.[3] ?? "a").toLowerCase();
      if (meridiem === "p" && hours !== 12) hours += 12;
      if (meridiem === "a" && hours === 12) hours = 0;
    }
    return new Date(yyyy, mm - 1, dd, hours, minutes, 0, 0);
  };

  const formatSpread = (spread: string | undefined, isFavorite: boolean) => {
    if (!spread || spread === "PK" || spread.trim() === "") return "LOADING";

    const numSpread = parseFloat(spread);
    if (isNaN(numSpread)) return spread;

    if (isFavorite) {
      return `${spread}`;
    } else {
      return `${spread}`;
    }
  };

  // Load teams/players and infer current week from games cache if available
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Don't load data if user is not authenticated
        if (!currentUser) {
          setLoading(false);
          return;
        }

        // Check cache first
        const cachedTeams = memCache.get<ITeam[]>("teams");
        // const cachedPlayers = memCache.get<IPlayer[]>("players");
        const cachedGames = memCache.get<IGame[]>("games");

        if (cachedTeams) {
          setTeams(cachedTeams);
          if (cachedGames && cachedGames.length > 0) {
            setGames(cachedGames);
            const weekNums = cachedGames
              .map((g) => g.gameWeek)
              .map((w) =>
                typeof w === "string" ? w.match(/\d+/)?.[0] : undefined
              )
              .filter((n): n is string => Boolean(n))
              .map((n) => Number(n))
              .filter((n) => !Number.isNaN(n));
            if (weekNums.length) {
              const cachedWeeksWithPicks =
                memCache.get<number[]>("weeks:withPicks") || [];
              const uniqueWeeks = [
                ...new Set([...weekNums, ...cachedWeeksWithPicks]),
              ].sort((a, b) => a - b);
              setAvailableWeeks(uniqueWeeks);
              const now = new Date();
              const weeksWithKickoffs = uniqueWeeks.map((wk) => {
                const gamesForWeek = cachedGames.filter((g) => {
                  const num = Number(
                    (g.gameWeek || "").match(/\d+/)?.[0] ?? NaN
                  );
                  return !Number.isNaN(num) && num === wk;
                });
                const hasUpcoming = gamesForWeek.some((g) => {
                  const dt = parseGameDateTime(
                    g.gameDate as string,
                    g.gameTime as string
                  );
                  return now <= new Date(dt.getTime() + 15 * 60 * 1000);
                });
                return { wk, hasUpcoming };
              });
              const upcoming = weeksWithKickoffs.find((w) => w.hasUpcoming)?.wk;
              const chosen = upcoming ?? Math.max(...uniqueWeeks);
              setSelectedWeek(chosen);
              // Fetch finalized-picks weeks in background and merge
              apiClient
                .get<{ success: boolean; data?: number[] }>("picks/weeks")
                .then((res) => {
                  const weeks = Array.isArray(res.data) ? res.data : [];
                  memCache.set("weeks:withPicks", weeks);
                  setAvailableWeeks((prev) => {
                    const merged = [
                      ...new Set([...(prev || []), ...weeks]),
                    ].sort((a, b) => a - b);
                    return merged;
                  });
                })
                .catch(() => {});
            } else {
              setSelectedWeek((prev) => prev ?? 1);
            }
            setLoading(false);
            return;
          }

          // Teams cached but games not cached: fetch games to determine week
          const gamesRes = await apiClient.get<{
            success: boolean;
            data?: IGame[];
          }>("games");
          const gameList = Array.isArray(gamesRes.data)
            ? (gamesRes.data as IGame[])
            : [];
          setGames(gameList);
          memCache.set("games", gameList);
          if (gameList.length) {
            const weekNums = gameList
              .map((g) => g.gameWeek)
              .map((w) =>
                typeof w === "string" ? w.match(/\d+/)?.[0] : undefined
              )
              .filter((n): n is string => Boolean(n))
              .map((n) => Number(n))
              .filter((n) => !Number.isNaN(n));
            if (weekNums.length) {
              const cachedWeeksWithPicks =
                memCache.get<number[]>("weeks:withPicks") || [];
              const uniqueWeeks = [
                ...new Set([...weekNums, ...cachedWeeksWithPicks]),
              ].sort((a, b) => a - b);
              setAvailableWeeks(uniqueWeeks);
              const now = new Date();
              const weeksWithKickoffs = uniqueWeeks.map((wk) => {
                const gamesForWeek = gameList.filter((g) => {
                  const num = Number(
                    (g.gameWeek || "").match(/\d+/)?.[0] ?? NaN
                  );
                  return !Number.isNaN(num) && num === wk;
                });
                const hasUpcoming = gamesForWeek.some((g) => {
                  const dt = parseGameDateTime(
                    g.gameDate as string,
                    g.gameTime as string
                  );
                  return now <= new Date(dt.getTime() + 15 * 60 * 1000);
                });
                return { wk, hasUpcoming };
              });
              const upcoming = weeksWithKickoffs.find((w) => w.hasUpcoming)?.wk;
              const chosen = upcoming ?? Math.max(...uniqueWeeks);
              setSelectedWeek(chosen);
              try {
                const weeksRes = await apiClient.get<{
                  success: boolean;
                  data?: number[];
                }>("picks/weeks");
                const weeks = Array.isArray(weeksRes.data) ? weeksRes.data : [];
                memCache.set("weeks:withPicks", weeks);
                setAvailableWeeks((prev) => {
                  const merged = [...new Set([...(prev || []), ...weeks])].sort(
                    (a, b) => a - b
                  );
                  return merged;
                });
              } catch {
                // ignore
              }
            } else {
              setSelectedWeek((prev) => prev ?? 1);
            }
          }
          setLoading(false);
          return;
        }

        // Fetch from API
        const [teamsRes, playersRes, weeksRes] = await Promise.all([
          apiClient.get<{ success: boolean; data?: ITeam[] }>("teams"),
          apiClient.get<{ success: boolean; data?: { items: IPlayer[] } }>(
            "players",
            { query: { limit: 500 } }
          ),
          apiClient.get<{ success: boolean; data?: number[] }>("picks/weeks"),
        ]);

        const teamList = Array.isArray(teamsRes.data) ? teamsRes.data : [];

        setTeams(teamList);
        const playerList = Array.isArray(playersRes.data?.items)
          ? playersRes.data.items
          : [];
        setPlayers(playerList);

        // Cache the results
        memCache.set("teams", teamList);
        memCache.set("players", playerList);
        const weeksWithPicks = Array.isArray(weeksRes.data)
          ? weeksRes.data
          : [];
        memCache.set("weeks:withPicks", weeksWithPicks);

        const gamesRes = await apiClient.get<{
          success: boolean;
          data?: IGame[];
        }>("games");
        const gameList = Array.isArray(gamesRes.data)
          ? (gamesRes.data as IGame[])
          : [];
        setGames(gameList);
        memCache.set("games", gameList);
        if (gameList.length) {
          const weekNums = gameList
            .map((g) => g.gameWeek)
            .map((w) =>
              typeof w === "string" ? w.match(/\d+/)?.[0] : undefined
            )
            .filter((n): n is string => Boolean(n))
            .map((n) => Number(n))
            .filter((n) => !Number.isNaN(n));
          if (weekNums.length) {
            const uniqueWeeks = [
              ...new Set([...weekNums, ...weeksWithPicks]),
            ].sort((a, b) => a - b);
            setAvailableWeeks(uniqueWeeks);
            const now = new Date();
            const weeksWithKickoffs = uniqueWeeks.map((wk) => {
              const gamesForWeek = gameList.filter((g) => {
                const num = Number((g.gameWeek || "").match(/\d+/)?.[0] ?? NaN);
                return !Number.isNaN(num) && num === wk;
              });
              const hasUpcoming = gamesForWeek.some((g) => {
                const dt = parseGameDateTime(
                  g.gameDate as string,
                  g.gameTime as string
                );
                return now <= new Date(dt.getTime() + 15 * 60 * 1000);
              });
              return { wk, hasUpcoming };
            });
            const upcoming = weeksWithKickoffs.find((w) => w.hasUpcoming)?.wk;
            const chosen = upcoming ?? Math.max(...uniqueWeeks);
            setSelectedWeek(chosen);
          } else {
            setSelectedWeek((prev) => prev ?? 1);
          }
        }
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser]); // Load data when user authentication changes

  // Load current user's picks to check if they've submitted
  useEffect(() => {
    if (!selectedWeek || !currentUser) return;
    let active = true;
    apiClient
      .get<{ success?: boolean; data?: BackendPick | null }>(
        `picks/${selectedWeek}`
      )
      .then((res) => {
        if (!active) return;
        const userPicks = res?.data;
        setCurrentUserPicks(userPicks || null);
        setHasCurrentUserSubmitted(Boolean(userPicks?.isFinalized));
      })
      .catch((err) => {
        console.error("Error loading current user picks:", err);
        if (!active) return;
        setCurrentUserPicks(null);
        setHasCurrentUserSubmitted(false);
      });
    return () => {
      active = false;
    };
  }, [selectedWeek, currentUser]);

  // Load all users' finalized picks for selected week
  useEffect(() => {
    if (!selectedWeek) return;
    let active = true;
    setIsRefreshing(true);
    apiClient
      .get<{ success?: boolean; data?: BackendPick[] }>(
        `picks/all/${selectedWeek}`
      )
      .then((res) => {
        if (!active) return;
        setAllPicks(
          Array.isArray(res?.data) ? (res.data as BackendPick[]) : []
        );
      })
      .catch((err) => {
        console.error("Error loading picks:", err);
        if (!active) return;
        setAllPicks([]);
      })
      .finally(() => {
        if (!active) return;
        setIsRefreshing(false);
      });
    return () => {
      active = false;
    };
  }, [selectedWeek]);

  // Live SSE updates with better error handling
  useEffect(() => {
    const streamUrl = `/api/v1/live-picks/stream`;
    let es: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connect = () => {
      try {
        es = new EventSource(streamUrl);

        es.onopen = () => {
          reconnectAttempts = 0;
        };

        es.onmessage = () => {
          if (!selectedWeek) return;
          const now = Date.now();
          // Debounce bursts (e.g., multiple events in quick succession)
          if (now - lastFetchAtRef.current < 800) return;
          if (isFetchingRef.current) return;
          isFetchingRef.current = true;
          lastFetchAtRef.current = now;
          apiClient
            .get<{ success?: boolean; data?: BackendPick[] }>(
              `picks/all/${selectedWeek}`
            )
            .then((res) => {
              setAllPicks(
                Array.isArray(res?.data) ? (res.data as BackendPick[]) : []
              );
              setJustUpdated(true);
              setTimeout(() => setJustUpdated(false), 2500);
            })
            .catch(() => {})
            .finally(() => {
              isFetchingRef.current = false;
            });
        };

        es.onerror = () => {
          es?.close();
          es = null;

          // Attempt to reconnect with exponential backoff
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(
              1000 * Math.pow(2, reconnectAttempts),
              30000
            );
            // silently retry with backoff
            reconnectTimeout = setTimeout(connect, delay);
          } else {
            // stop retrying after max attempts
          }
        };
      } catch {
        // silently ignore create errors
      }
    };

    // Do not connect if user is not authenticated
    if (currentUser) {
      connect();
    }

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (es) {
        es.close();
      }
    };
  }, [selectedWeek, currentUser]);

  // Fallback polling when SSE fails
  useEffect(() => {
    const interval = setInterval(() => {
      if (!selectedWeek) return;
      // Only poll if we haven't received updates recently
      const now = Date.now();
      if (now - lastFetchAtRef.current > 60000) {
        // 1 minute since last update
        apiClient
          .get<{ success?: boolean; data?: BackendPick[] }>(
            `picks/all/${selectedWeek}`
          )
          .then((res) => {
            setAllPicks(
              Array.isArray(res?.data) ? (res.data as BackendPick[]) : []
            );
          })
          .catch(() => {
            // Silently fail for polling
          });
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [selectedWeek]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setError(null);

    // Reload data
    const loadData = async () => {
      try {
        const [teamsRes, playersRes] = await Promise.all([
          apiClient.get<{ success: boolean; data?: ITeam[] }>("teams"),
          apiClient.get<{ success: boolean; data?: { items: IPlayer[] } }>(
            "players",
            { query: { limit: 500 } }
          ),
        ]);
        const teamList = Array.isArray(teamsRes.data) ? teamsRes.data : [];
        setTeams(teamList);
        memCache.set("teams", teamList);
        const playerList = Array.isArray(playersRes.data?.items)
          ? playersRes.data.items
          : [];
        setPlayers(playerList);
        memCache.set("players", playerList);
      } catch (err) {
        console.error("Error refreshing data:", err);
        setError("Failed to refresh data. Please try again.");
      } finally {
        setIsRefreshing(false);
      }
    };

    loadData();
  };

  // State to store users for avatar lookup
  const [users, setUsers] = useState<
    Array<{ _id: string; username: string; avatar: string }>
  >([]);
  // State to store individual player data for TD scorers
  const [playerData, setPlayerData] = useState<Record<string, IPlayer>>({});

  // Fetch users from backend
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiClient.get<{
          success: boolean;
          data?: Array<{ _id: string; username: string; avatar: string }>;
        }>("users");
        if (response.data && Array.isArray(response.data)) {
          setUsers(response.data);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);

  // Function to fetch individual player data
  const fetchPlayerData = useCallback(
    async (playerId: string) => {
      if (!playerId || playerData[playerId]) return; // Already fetched or no ID

      try {
        const response = await apiClient.get<{
          success: boolean;
          data?: IPlayer;
        }>(`players/${playerId}`);
        if (response.data) {
          setPlayerData((prev) => ({
            ...prev,
            [playerId]: response.data!,
          }));
        }
      } catch (error) {
        console.error(`Error fetching player ${playerId}:`, error);
      }
    },
    [playerData]
  );

  // Helper function to get user avatar from backend
  const getUserAvatar = useCallback(
    (userName: string) => {
      const user = users.find((u) => u.username === userName);
      if (user && user.avatar) {
        return computeAvatarUrl(user.avatar);
      }

      // Fallback to default avatar if user not found or no avatar
      return "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face";
    },
    [users]
  );

  // Player helpers
  const getPlayerById = useCallback(
    (id: string) => {
      return players.find((p) => String(p.playerID) === String(id));
    },
    [players]
  );
  const getPlayerHeadshot = useCallback((player: IPlayer | undefined) => {
    if (!player) return null;
    if (player.espnHeadshot && player.espnHeadshot.trim() !== "")
      return player.espnHeadshot;
    return `https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop&crop=face`;
  }, []);

  // Transform backend picks for display using real data (no mocks)
  type DisplayUserPicks = {
    userId: string;
    userName: string;
    userAvatar: string;
    picks: { team: string; isCorrect: boolean }[];
    lock: { team: string; isCorrect: boolean };
    tdScorer: {
      player: string;
      playerId: string;
      playerHeadshot: string | null;
      isCorrect: boolean;
    };
    propBet: { description: string; isCorrect: boolean; status: string };
    totalPoints: number;
  };

  // Fetch betting odds for games
  useEffect(() => {
    if (!selectedWeek || !games.length) return;

    const currentWeekGames = games.filter((g) => {
      const weekNum = Number(g.gameWeek.match(/\d+/)?.[0] ?? NaN);
      return !Number.isNaN(weekNum) && weekNum === selectedWeek;
    });

    // First, load any cached odds
    const cachedOdds: Record<
      string,
      { awayTeamSpread?: string; homeTeamSpread?: string }
    > = {};
    currentWeekGames.forEach((game) => {
      const cached = memCache.get(`odds:${game.gameID}`);
      if (cached) {
        cachedOdds[game.gameID] = cached;
      }
    });

    if (Object.keys(cachedOdds).length > 0) {
      setOddsByGameId((prev) => ({ ...prev, ...cachedOdds }));
    }

    // Only fetch odds for games we don't already have
    const gamesToFetch = currentWeekGames.filter(
      (game) => !memCache.get(`odds:${game.gameID}`)
    );

    if (gamesToFetch.length === 0) return;

    const fetchOdds = async () => {
      for (let i = 0; i < gamesToFetch.length; i++) {
        const game = gamesToFetch[i];
        let retryCount = 0;
        const maxRetries = 2;

        while (retryCount <= maxRetries) {
          try {
            const res = await apiClient.get<{
              success: boolean;
              data?: {
                odds?: { awayTeamSpread?: string; homeTeamSpread?: string };
              };
            }>(`betting-odds/${encodeURIComponent(game.gameID)}`);

            // Check if response exists and has data with odds
            if (res && res.data && res.data.odds) {
              const oddsData = res.data.odds;
              setOddsByGameId((prev) => ({
                ...prev,
                [game.gameID]: oddsData,
              }));
              // Cache the odds to prevent refetching
              memCache.set(`odds:${game.gameID}`, oddsData);
              break; // Success, exit retry loop
            } else {
              // No odds data available, don't retry
              break;
            }
          } catch (err) {
            retryCount++;
            if (retryCount <= maxRetries) {
              console.warn(
                `Retrying odds fetch for game ${game.gameID} (attempt ${retryCount}/${maxRetries})`
              );
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * retryCount)
              );
            } else {
              console.error(
                `Failed to fetch odds for game ${game.gameID} after ${maxRetries} retries:`,
                err
              );
            }
          }
        }

        // Add a small delay between requests to avoid overwhelming the API
        if (i < gamesToFetch.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
    };

    fetchOdds();
  }, [selectedWeek, games]);

  const transformedPicks = useMemo<DisplayUserPicks[]>(() => {
    // Include current user's picks if they exist, plus other users' picks if current user has submitted
    const base: BackendPick[] = [];

    // Add current user's picks if they exist
    if (currentUserPicks) {
      base.push(currentUserPicks);
    }

    // Add other users' picks if current user has submitted
    if (hasCurrentUserSubmitted && allPicks) {
      // Filter out current user's picks from allPicks to avoid duplicates
      const otherPicks = allPicks.filter((pick) => {
        const userId =
          typeof pick.user === "string" ? pick.user : pick.user?._id;
        const currentUserId =
          typeof currentUserPicks?.user === "string"
            ? currentUserPicks.user
            : currentUserPicks?.user?._id;
        return userId !== currentUserId;
      });
      base.push(...otherPicks);
    }

    if (base.length === 0) return [];
    return base.map((p: BackendPick): DisplayUserPicks => {
      const outcomesArray = Object.entries(p.selections || {}).map(
        ([gid, team]) => {
          const ok = p.outcomes ? p.outcomes[gid] : null;
          return { team: team as string, isCorrect: ok === true };
        }
      );
      const userId =
        typeof p.user === "string" ? p.user : p.user?._id || "unknown";
      const userName = (() => {
        if (typeof p.user === "string") {
          // If user is just an ID string, try to find the user in our users list
          const foundUser = users.find((u) => u._id === p.user);
          return foundUser?.username || "User";
        } else {
          return p.user?.username || "User";
        }
      })();
      const userAvatar = (() => {
        if (typeof p.user === "string") {
          // If user is just an ID string, try to find the user in our users list
          const foundUser = users.find((u) => u._id === p.user);
          if (foundUser?.avatar) {
            return computeAvatarUrl(foundUser.avatar);
          }
          return getUserAvatar("Unknown User");
        } else if (p.user?.avatar) {
          return computeAvatarUrl(p.user.avatar);
        } else {
          return getUserAvatar(userName || "Unknown User");
        }
      })();
      return {
        userId,
        userName,
        userAvatar,
        picks: outcomesArray,
        lock: { team: (p.lockOfWeek as string) || "", isCorrect: false },
        tdScorer: {
          player:
            playerData[p.touchdownScorer || ""]?.longName ||
            getPlayerById(p.touchdownScorer || "")?.longName ||
            p.touchdownScorer ||
            "",
          playerId: p.touchdownScorer || "",
          playerHeadshot:
            playerData[p.touchdownScorer || ""]?.espnHeadshot ||
            getPlayerHeadshot(getPlayerById(p.touchdownScorer || "")),
          isCorrect: false,
        },
        propBet: {
          description: p.propBet || "",
          isCorrect: false,
          status: p.propBetStatus || "pending",
        },
        totalPoints: 0,
      };
    });
  }, [
    allPicks,
    currentUserPicks,
    getPlayerById,
    getPlayerHeadshot,
    getUserAvatar,
    playerData,
    hasCurrentUserSubmitted,
    users,
  ]);

  // Fetch player data for TD scorers when picks are loaded
  useEffect(() => {
    const allPicksToProcess = [...allPicks];
    if (currentUserPicks) {
      allPicksToProcess.push(currentUserPicks);
    }

    if (allPicksToProcess.length > 0) {
      allPicksToProcess.forEach((pick) => {
        if (pick.touchdownScorer) {
          fetchPlayerData(pick.touchdownScorer);
        }
      });
    }
  }, [allPicks, currentUserPicks, fetchPlayerData]);

  // Helper function to get team logo
  const getTeamLogo = useCallback(
    (teamAbv: string) => {
      const team = teams.find((t) => t.teamAbv === teamAbv);
      if (team?.espnLogo1) {
        return team.espnLogo1;
      }
      if (team?.nflComLogo1) {
        return team.nflComLogo1;
      }
      // Fallback to a generic NFL logo
      return "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop&crop=face";
    },
    [teams]
  );

  const getOutcomeIcon = (isCorrect: boolean) => {
    return isCorrect ? (
      <Check className="h-6 w-6 text-green-500" />
    ) : (
      <X className="h-6 w-6 text-red-500" />
    );
  };

  // Function to check if a game is finished
  const isGameFinished = (gameDate: string, gameTime: string) => {
    const gameDateTime = parseGameDateTime(gameDate, gameTime);
    const now = new Date();
    const bufferMinutes = 15; // 15 minutes after game start
    const cutoffTime = new Date(
      gameDateTime.getTime() + bufferMinutes * 60 * 1000
    );
    return now > cutoffTime;
  };

  return (
    <div className="space-y-6">
      {/* Header with week selector and manual refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Live Picks</h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-muted-foreground">Compare all users by week</p>
            {availableWeeks.length > 0 && (
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
                {justUpdated && (
                  <Badge variant="default" className="text-sm">
                    Updated
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading picks data...</p>
        </div>
      )}

      {/* No Data State */}
      {!loading && transformedPicks.length === 0 && (
        <div className="text-center py-8">
          {!currentUserPicks ? (
            <div className="space-y-4">
              <p className="text-muted-foreground text-lg font-medium">
                No picks found for this week
              </p>
              <p className="text-muted-foreground">
                Make your picks to get started!
              </p>
              <Button
                onClick={() => (window.location.href = "/picks")}
                className="mt-4"
              >
                Go to Make Picks
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">No picks data available</p>
          )}
        </div>
      )}

      {/* Spread Picks */}
      {!loading && transformedPicks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Spread Picks
            </CardTitle>
            <CardDescription>
              Compare all users' spread picks for this week
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Header avatars aligned with columns */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {transformedPicks.map((user) => {
                const isCurrentUser =
                  currentUserPicks &&
                  (typeof currentUserPicks.user === "string"
                    ? currentUserPicks.user
                    : currentUserPicks.user?._id) === user.userId;

                return (
                  <div
                    key={user.userId}
                    className="flex flex-col items-center justify-center"
                  >
                    <img
                      src={user.userAvatar}
                      alt={user.userName}
                      className={`w-12 h-12 rounded-full object-cover border-2 shadow ${
                        isCurrentUser
                          ? "border-yellow-400 ring-2 ring-yellow-400"
                          : "border-primary"
                      }`}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = getUserAvatar(user.userName);
                      }}
                    />
                    {isCurrentUser && (
                      <span className="text-xs font-bold text-yellow-600 mt-1">
                        YOU
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Game rows: each cell shows the user's pick for that match */}
            {(() => {
              const users = transformedPicks;
              const maxGames = Math.max(...users.map((u) => u.picks.length));
              return (
                <div className="space-y-3">
                  {Array.from({ length: maxGames }).map((_, gameIdx) => {
                    // Get the game info for this row to show spreads
                    const gameId = Object.keys(users[0]?.picks || {})[gameIdx];
                    const game = games.find((g) => String(g.gameID) === gameId);
                    const odds = game ? oddsByGameId[game.gameID] : null;

                    return (
                      <div key={gameIdx}>
                        {/* Game info with spreads */}
                        {game &&
                          (() => {
                            const awayTeam = teams.find(
                              (t) => t.teamID === game.teamIDAway
                            );
                            const homeTeam = teams.find(
                              (t) => t.teamID === game.teamIDHome
                            );

                            // Count picks for each team
                            const awayTeamPicks = users.filter((user) => {
                              const pick = user.picks[gameIdx];
                              return pick && pick.team === awayTeam?.teamAbv;
                            }).length;

                            const homeTeamPicks = users.filter((user) => {
                              const pick = user.picks[gameIdx];
                              return pick && pick.team === homeTeam?.teamAbv;
                            }).length;

                            // Determine which team is the favorite based on spread
                            const awaySpread = odds?.awayTeamSpread;
                            const homeSpread = odds?.homeTeamSpread;
                            const awayIsFavorite = Boolean(
                              awaySpread && awaySpread.startsWith("-")
                            );
                            const homeIsFavorite = Boolean(
                              homeSpread && homeSpread.startsWith("-")
                            );

                            return (
                              <div className="mb-3 p-3 bg-gradient-to-r from-muted/30 to-muted/50 rounded-lg border">
                                <div className="flex items-center justify-center">
                                  <div className="flex items-center gap-3 text-lg font-medium">
                                    <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
                                      <img
                                        src={getTeamLogo(
                                          awayTeam?.teamAbv || ""
                                        )}
                                        alt={awayTeam?.teamAbv}
                                        className="w-6 h-6 rounded-full"
                                      />
                                      <span className="font-semibold">
                                        {awayTeam?.teamAbv}
                                      </span>
                                      <div className="text-sm text-muted-foreground font-normal">
                                        {formatSpread(
                                          odds?.awayTeamSpread,
                                          awayIsFavorite
                                        )}
                                      </div>
                                      <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-semibold">
                                        {awayTeamPicks} picks
                                      </div>
                                    </div>
                                    <span className="text-muted-foreground text-xl">
                                      @
                                    </span>
                                    <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
                                      <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-semibold">
                                        {homeTeamPicks} picks
                                      </div>
                                      <div className="text-sm text-muted-foreground font-normal">
                                        {formatSpread(
                                          odds?.homeTeamSpread,
                                          homeIsFavorite
                                        )}
                                      </div>
                                      <span className="font-semibold">
                                        {homeTeam?.teamAbv}
                                      </span>
                                      <img
                                        src={getTeamLogo(
                                          homeTeam?.teamAbv || ""
                                        )}
                                        alt={homeTeam?.teamAbv}
                                        className="w-6 h-6 rounded-full"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                        {/* User picks */}
                        <div className="grid grid-cols-3 gap-3">
                          {users.map((user) => {
                            const pick = user.picks[gameIdx];
                            if (!pick) {
                              return (
                                <div
                                  key={user.userId}
                                  className="h-16 rounded-lg bg-muted/50 border border-border"
                                />
                              );
                            }
                            const teamLogo = getTeamLogo(pick.team);
                            return (
                              <div
                                key={user.userId}
                                className="bg-white text-black p-3 rounded-lg text-center font-bold text-sm shadow-md border-2 border-gray-300 flex flex-col items-center justify-center"
                              >
                                <img
                                  src={teamLogo}
                                  alt={pick.team}
                                  className="w-10 h-10 rounded-full object-cover mb-1"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                  }}
                                />
                                <span className="text-xs font-bold">
                                  {pick.team}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Lock of the Week */}
      {!loading && transformedPicks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Lock of the Week
            </CardTitle>
            <CardDescription>
              Each player's most confident pick for double points
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {transformedPicks.map((user) => {
                const isCurrentUser =
                  currentUserPicks &&
                  (typeof currentUserPicks.user === "string"
                    ? currentUserPicks.user
                    : currentUserPicks.user?._id) === user.userId;
                const teamLogo = getTeamLogo(user.lock.team);
                return (
                  <div
                    key={user.userId}
                    className={`bg-white text-black p-4 rounded-lg text-center font-bold text-sm relative shadow-lg border-2 ${
                      isCurrentUser
                        ? "border-yellow-400 ring-2 ring-yellow-400"
                        : "border-gray-300"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={teamLogo}
                        alt={user.lock.team}
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                      <span className="text-sm font-bold">
                        {user.lock.team}
                      </span>
                      <div className="text-xs opacity-75">
                        {user.userName}
                        {isCurrentUser && (
                          <span className="text-yellow-600 font-bold ml-1">
                            (YOU)
                          </span>
                        )}
                      </div>
                    </div>
                    {user.lock.isCorrect && (
                      <div className="absolute -top-2 -right-2">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Touchdown Scorer */}
      {!loading && transformedPicks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Touchdown Scorer
            </CardTitle>
            <CardDescription>
              Player touchdown scorer predictions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {transformedPicks.map((user) => {
                const isCurrentUser =
                  currentUserPicks &&
                  (typeof currentUserPicks.user === "string"
                    ? currentUserPicks.user
                    : currentUserPicks.user?._id) === user.userId;

                return (
                  <div key={user.userId} className="text-center">
                    <div
                      className={`relative bg-card rounded-lg p-3 shadow-md border ${
                        isCurrentUser
                          ? "border-yellow-400 ring-2 ring-yellow-400"
                          : "border-border"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        {user.tdScorer.playerHeadshot ? (
                          <img
                            src={user.tdScorer.playerHeadshot}
                            alt={user.tdScorer.player}
                            className="w-16 h-16 rounded-full object-cover border-3 border-border shadow-md"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = getUserAvatar(user.userName);
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-2xl shadow-md">
                            🏈
                          </div>
                        )}
                        <div className="text-center">
                          <p className="text-sm font-bold text-foreground">
                            {user.tdScorer.player}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.userName}
                            {isCurrentUser && (
                              <span className="text-yellow-600 font-bold ml-1">
                                (YOU)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="absolute -top-2 -right-2">
                        {(() => {
                          // Find the game for this week to check if it's finished
                          const currentWeekGames = games.filter((g) => {
                            const weekNum = Number(
                              g.gameWeek.match(/\d+/)?.[0] ?? NaN
                            );
                            return (
                              !Number.isNaN(weekNum) && weekNum === selectedWeek
                            );
                          });

                          // For now, we'll assume the game is finished if we have any games for this week
                          // In a real implementation, you'd check the specific game time
                          const gameFinished =
                            currentWeekGames.length > 0 &&
                            currentWeekGames.some((game) =>
                              isGameFinished(
                                game.gameDate as string,
                                game.gameTime as string
                              )
                            );

                          if (!gameFinished) {
                            // Game not finished yet, don't show outcome
                            return null;
                          }

                          // Game is finished, show the outcome
                          return user.tdScorer.isCorrect ? (
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                              <X className="h-4 w-4 text-white" />
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prop Bet */}
      {!loading && transformedPicks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Prop Bet
            </CardTitle>
            <CardDescription>
              Proposition bets from players with live status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {transformedPicks.map((user) => {
                const hasProp = Boolean(user.propBet.description);
                const isCurrentUser =
                  currentUserPicks &&
                  (typeof currentUserPicks.user === "string"
                    ? currentUserPicks.user
                    : currentUserPicks.user?._id) === user.userId;
                return (
                  <div key={user.userId} className="relative">
                    <div
                      className={`bg-card p-4 rounded-lg shadow-md border ${
                        isCurrentUser
                          ? "border-yellow-400 ring-2 ring-yellow-400"
                          : "border-border"
                      }`}
                    >
                      {/* Status badge */}
                      {hasProp && (
                        <div className="absolute -top-2 left-2">
                          {user.propBet.status === "approved" && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                              Approved
                            </span>
                          )}
                          {user.propBet.status === "pending" && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
                              Pending
                            </span>
                          )}
                          {user.propBet.status === "rejected" && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                              Rejected
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex flex-col items-center gap-3 text-center">
                        <img
                          src={user.userAvatar}
                          alt={user.userName}
                          className="w-12 h-12 rounded-full object-cover border-2 border-border"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = getUserAvatar(user.userName);
                          }}
                        />
                        <div className="w-full">
                          <p className="text-sm font-semibold text-foreground mb-2">
                            {hasProp ? user.propBet.description : "No prop bet submitted"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.userName}
                            {isCurrentUser && (
                              <span className="text-yellow-600 font-bold ml-1">
                                (YOU)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Show only green check when approved; no X */}
                    {hasProp && user.propBet.status === "approved" && (
                      <div className="absolute -top-2 -right-2">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total Points */}
      {!loading && transformedPicks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Total Points
            </CardTitle>
            <CardDescription>Current standings for this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {transformedPicks.map((user, index) => {
                const isCurrentUser =
                  currentUserPicks &&
                  (typeof currentUserPicks.user === "string"
                    ? currentUserPicks.user
                    : currentUserPicks.user?._id) === user.userId;
                const isLeader = index === 0; // First user is leader
                return (
                  <div key={user.userId} className="text-center">
                    <div
                      className={`${
                        isLeader
                          ? "bg-black text-white shadow-lg scale-105"
                          : isCurrentUser
                          ? "bg-yellow-100 text-black shadow-lg scale-105"
                          : "bg-white text-black shadow-md"
                      } p-4 rounded-lg text-2xl font-bold mb-3 border-2 ${
                        isLeader
                          ? "border-black"
                          : isCurrentUser
                          ? "border-yellow-400"
                          : "border-gray-300"
                      }`}
                    >
                      {user.totalPoints}
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={user.userAvatar}
                        alt={user.userName}
                        className={`w-10 h-10 rounded-full object-cover border-3 ${
                          isLeader
                            ? "border-yellow-400 shadow-lg"
                            : isCurrentUser
                            ? "border-yellow-400 shadow-lg"
                            : "border-border"
                        }`}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = getUserAvatar(user.userName);
                        }}
                      />
                      <div className="text-center">
                        <p className="text-sm font-bold text-foreground">
                          {user.userName}
                          {isCurrentUser && (
                            <span className="text-yellow-600 font-bold ml-1">
                              (YOU)
                            </span>
                          )}
                        </p>
                        {isLeader && !isCurrentUser && (
                          <p className="text-xs text-yellow-600 font-semibold">
                            LEADER
                          </p>
                        )}
                        {isLeader && isCurrentUser && (
                          <p className="text-xs text-yellow-600 font-semibold">
                            YOU ARE LEADER!
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Desktop/Tablet View - Hidden on mobile */}
      <div className="hidden lg:block">
        <div className="max-w-6xl mx-auto p-6">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="spreads">Spread Picks</TabsTrigger>
              <TabsTrigger value="locks">Locks</TabsTrigger>
              <TabsTrigger value="td-scorers">TD Scorers</TabsTrigger>
              <TabsTrigger value="prop-bets">Prop Bets</TabsTrigger>
            </TabsList>

            <TabsContent value="spreads" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Week {selectedWeek} Spread Picks</CardTitle>
                  <CardDescription>
                    All player spread picks with outcomes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-muted-foreground mt-2">
                        Loading picks...
                      </p>
                    </div>
                  ) : transformedPicks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        No picks data available
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Game Summary with Pick Counts */}
                      <div className="mb-6 p-4 bg-muted/30 rounded-lg">
                        <h4 className="font-semibold mb-3 text-center">
                          Pick Distribution by Game
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {games
                            .filter((g) => {
                              const weekNum = Number(
                                g.gameWeek.match(/\d+/)?.[0] ?? NaN
                              );
                              return (
                                !Number.isNaN(weekNum) &&
                                weekNum === selectedWeek
                              );
                            })
                            .map((game) => {
                              const awayTeam = teams.find(
                                (t) => t.teamID === game.teamIDAway
                              );
                              const homeTeam = teams.find(
                                (t) => t.teamID === game.teamIDHome
                              );
                              const odds = oddsByGameId[game.gameID];

                              // Count picks for this game
                              const awayTeamPicks = transformedPicks.filter(
                                (user) =>
                                  user.picks.some(
                                    (pick) => pick.team === awayTeam?.teamAbv
                                  )
                              ).length;
                              const homeTeamPicks = transformedPicks.filter(
                                (user) =>
                                  user.picks.some(
                                    (pick) => pick.team === homeTeam?.teamAbv
                                  )
                              ).length;

                              // Determine which team is the favorite based on spread
                              const awaySpread = odds?.awayTeamSpread;
                              const homeSpread = odds?.homeTeamSpread;
                              const awayIsFavorite = Boolean(
                                awaySpread && awaySpread.startsWith("-")
                              );
                              const homeIsFavorite = Boolean(
                                homeSpread && homeSpread.startsWith("-")
                              );

                              return (
                                <div
                                  key={game.gameID}
                                  className="p-3 bg-background rounded-lg border"
                                >
                                  <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                      <img
                                        src={getTeamLogo(
                                          awayTeam?.teamAbv || ""
                                        )}
                                        alt={awayTeam?.teamAbv}
                                        className="w-4 h-4 rounded-full"
                                      />
                                      <span className="font-medium">
                                        {awayTeam?.teamAbv}
                                      </span>
                                      <span className="text-muted-foreground">
                                        {formatSpread(
                                          odds?.awayTeamSpread,
                                          awayIsFavorite
                                        )}
                                      </span>
                                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                        {awayTeamPicks}
                                      </span>
                                    </div>
                                    <span className="text-muted-foreground">
                                      @
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                        {homeTeamPicks}
                                      </span>
                                      <span className="text-muted-foreground">
                                        {formatSpread(
                                          odds?.homeTeamSpread,
                                          homeIsFavorite
                                        )}
                                      </span>
                                      <span className="font-medium">
                                        {homeTeam?.teamAbv}
                                      </span>
                                      <img
                                        src={getTeamLogo(
                                          homeTeam?.teamAbv || ""
                                        )}
                                        alt={homeTeam?.teamAbv}
                                        className="w-4 h-4 rounded-full"
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      {transformedPicks.map((user) => (
                        <div
                          key={user.userId}
                          className="p-4 border rounded-lg"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <img
                              src={user.userAvatar}
                              alt={user.userName}
                              className="w-10 h-10 rounded-full object-cover border-2 border-primary"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = getUserAvatar(user.userName);
                              }}
                            />
                            <div>
                              <h3 className="font-semibold">{user.userName}</h3>
                              <p className="text-sm text-muted-foreground">
                                {user.picks.filter((p) => p.isCorrect).length}/
                                {user.picks.length} correct
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-9 gap-2">
                            {user.picks.map((pick, index) => {
                              const teamLogo = getTeamLogo(pick.team);
                              // Find the game to get the spread
                              const game = games.find((g) => {
                                const awayTeam = teams.find(
                                  (t) => t.teamID === g.teamIDAway
                                );
                                const homeTeam = teams.find(
                                  (t) => t.teamID === g.teamIDHome
                                );
                                return (
                                  awayTeam?.teamAbv === pick.team ||
                                  homeTeam?.teamAbv === pick.team
                                );
                              });
                              const odds = game
                                ? oddsByGameId[game.gameID]
                                : null;
                              const isAwayTeam =
                                game &&
                                teams.find((t) => t.teamID === game.teamIDAway)
                                  ?.teamAbv === pick.team;
                              const rawSpread = isAwayTeam
                                ? odds?.awayTeamSpread
                                : odds?.homeTeamSpread;
                              const isFavorite = Boolean(
                                rawSpread && rawSpread.startsWith("-")
                              );
                              const spread = formatSpread(
                                rawSpread,
                                isFavorite
                              );

                              return (
                                <div
                                  key={index}
                                  className="bg-white text-black p-2 rounded-lg text-center text-xs font-bold relative shadow-md border border-gray-300"
                                >
                                  <div className="flex flex-col items-center gap-1">
                                    <img
                                      src={teamLogo}
                                      alt={pick.team}
                                      className="w-4 h-4 rounded-full object-cover"
                                      onError={(e) => {
                                        const target =
                                          e.target as HTMLImageElement;
                                        target.style.display = "none";
                                      }}
                                    />
                                    <span className="text-xs font-bold">
                                      {pick.team}
                                    </span>
                                    <div className="text-xs text-gray-600 font-normal">
                                      {spread || "LOADING"}
                                    </div>
                                  </div>
                                  {pick.isCorrect && (
                                    <div className="absolute -top-1 -right-1">
                                      <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                        <Check className="h-3 w-3 text-white" />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="locks" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Lock of the Week</CardTitle>
                  <CardDescription>
                    Each player's most confident pick
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-muted-foreground mt-2">
                        Loading picks...
                      </p>
                    </div>
                  ) : transformedPicks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        No picks data available
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {transformedPicks.map((user) => {
                        return (
                          <div
                            key={user.userId}
                            className="p-4 border rounded-lg text-center"
                          >
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <img
                                src={user.userAvatar}
                                alt={user.userName}
                                className="w-8 h-8 rounded-full object-cover border-2 border-primary"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = getUserAvatar(user.userName);
                                }}
                              />
                              <span className="font-semibold">
                                {user.userName}
                              </span>
                            </div>
                            <div className="bg-white text-black p-4 rounded-lg text-center font-bold text-lg relative shadow-lg border-2 border-gray-300">
                              <div className="flex flex-col items-center gap-2">
                                <img
                                  src={getTeamLogo(user.lock.team)}
                                  alt={user.lock.team}
                                  className="w-8 h-8 rounded-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                  }}
                                />
                                <span className="text-lg font-bold">
                                  {user.lock.team}
                                </span>
                              </div>
                              {user.lock.isCorrect && (
                                <div className="absolute -top-2 -right-2">
                                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                                    <Check className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="td-scorers" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Touchdown Scorers</CardTitle>
                  <CardDescription>
                    Player touchdown scorer predictions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-muted-foreground mt-2">
                        Loading picks...
                      </p>
                    </div>
                  ) : transformedPicks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        No picks data available
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {transformedPicks.map((user) => (
                        <div key={user.userId} className="text-center">
                          <div className="flex items-center justify-center gap-2 mb-3">
                            <img
                              src={user.userAvatar}
                              alt={user.userName}
                              className="w-8 h-8 rounded-full object-cover border-2 border-primary"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = getUserAvatar(user.userName);
                              }}
                            />
                            <span className="font-semibold">
                              {user.userName}
                            </span>
                          </div>
                          <div className="relative">
                            {user.tdScorer.playerHeadshot ? (
                              <img
                                src={user.tdScorer.playerHeadshot}
                                alt={user.tdScorer.player}
                                className="w-20 h-20 rounded-full mx-auto mb-2 object-cover border-2 border-border"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = getUserAvatar(user.userName);
                                }}
                              />
                            ) : (
                              <div className="w-20 h-20 bg-muted rounded-full mx-auto mb-2 flex items-center justify-center text-3xl">
                                🏈
                              </div>
                            )}
                            {(() => {
                              // Find the game for this week to check if it's finished
                              const currentWeekGames = games.filter((g) => {
                                const weekNum = Number(
                                  g.gameWeek.match(/\d+/)?.[0] ?? NaN
                                );
                                return (
                                  !Number.isNaN(weekNum) &&
                                  weekNum === selectedWeek
                                );
                              });

                              // For now, we'll assume the game is finished if we have any games for this week
                              const gameFinished =
                                currentWeekGames.length > 0 &&
                                currentWeekGames.some((game) =>
                                  isGameFinished(
                                    game.gameDate as string,
                                    game.gameTime as string
                                  )
                                );

                              if (!gameFinished) {
                                // Game not finished yet, don't show outcome
                                return null;
                              }

                              // Game is finished, show the outcome
                              return getOutcomeIcon(user.tdScorer.isCorrect);
                            })()}
                            <p className="text-lg font-semibold mt-2">
                              {user.tdScorer.player}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="prop-bets" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Prop Bets</CardTitle>
                  <CardDescription>
                    Proposition bets from players with live status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-muted-foreground mt-2">
                        Loading picks...
                      </p>
                    </div>
                  ) : transformedPicks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        No picks data available
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {transformedPicks
                        .filter((user) => user.propBet.description)
                        .map((user) => (
                          <div
                            key={user.userId}
                            className="p-4 border rounded-lg relative"
                          >
                            {/* Status badge */}
                            <div className="absolute -top-2 left-2">
                              {user.propBet.status === "approved" && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                                  Approved
                                </span>
                              )}
                              {user.propBet.status === "pending" && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
                                  Pending
                                </span>
                              )}
                              {user.propBet.status === "rejected" && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                                  Rejected
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mb-2">
                              <img
                                src={user.userAvatar}
                                alt={user.userName}
                                className="w-8 h-8 rounded-full object-cover border-2 border-primary"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = getUserAvatar(user.userName);
                                }}
                              />
                              <span className="font-semibold">
                                {user.userName}
                              </span>
                            </div>
                            <div className="bg-muted/50 p-3 rounded-lg">
                              <p className="font-medium">
                                {user.propBet.description}
                              </p>
                            </div>
                            {/* Show only green check when approved; no X */}
                            {user.propBet.status === "approved" && (
                              <div className="absolute -top-2 -right-2">
                                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                                  <Check className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default LivePicks;
