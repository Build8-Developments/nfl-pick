import { useAuth } from "../contexts/useAuth";
import { useEffect, useState } from "react";
import { dashboardApi, apiClient } from "@/lib/api";
import { useUserAvatars } from "../hooks/useAvatarService";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trophy,
  Target,
  Calendar,
  TrendingUp,
  Clock,
  Users,
} from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

// Utility function to get player name by ID
const getPlayerName = async (playerId: string): Promise<string> => {
  try {
    const response = await dashboardApi.getPlayerById(playerId);
    if (response.success && response.data) {
      return (
        response.data.longName ||
        response.data.espnName ||
        response.data.cbsLongName ||
        playerId
      );
    }
  } catch (error) {
    console.error("Error fetching player name:", error);
  }
  return playerId; // Fallback to ID if name fetch fails
};

const Dashboard = () => {
  const { currentUser, isLoading: authLoading } = useAuth();
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [historyWeeks, setHistoryWeeks] = useState<number[]>([]);
  const [selectedHistoryWeek, setSelectedHistoryWeek] = useState<number | null>(
    null
  );
  const [historyPick, setHistoryPick] = useState<{
    selections: Record<string, string>;
    lockOfWeek?: string;
    touchdownScorer?: string;
    touchdownScorerName?: string;
    propBet?: string;
    isFinalized?: boolean;
  } | null>(null);
  const [games, setGames] = useState<
    Array<{
      gameID: string;
      gameWeek: string;
      gameTime: string;
      gameTimeEpoch?: string;
      gameStatus?: string;
      gameStatusCode?: string;
      gameDate?: string;
    }>
  >([]);
  const [summary, setSummary] = useState<{
    totalUsers: number;
    totalPicks: number;
    upcomingGames: Array<{
      gameID: string;
      gameWeek: string;
      home: string;
      away: string;
      gameDate: string;
      gameTime: string;
    }>;
  } | null>(null);
  const [userPick, setUserPick] = useState<{
    selections: Record<string, string>;
    lockOfWeek?: string;
    touchdownScorer?: string;
    touchdownScorerName?: string;
    propBet?: string;
    isFinalized?: boolean;
  } | null>(null);
  const [leaderboard, setLeaderboard] = useState<
    Array<{ user: string; wins: number; losses: number; winPct: number }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>("");
  const [seasonRecord, setSeasonRecord] = useState<{
    wins: number;
    losses: number;
    percentage: number;
  }>({
    wins: 0,
    losses: 0,
    percentage: 0,
  });

  // Function to calculate season record from picks data
  const calculateSeasonRecord = async () => {
    // Don't calculate if user is not authenticated
    if (!currentUser) {
      return;
    }

    try {
      let totalWins = 0;
      let totalLosses = 0;

      // Get all weeks with picks
      const weeksRes = await apiClient.get<{
        success: boolean;
        data?: number[];
      }>("picks/weeks");
      const weeks = Array.isArray(weeksRes.data) ? weeksRes.data : [];

      // For each week, get the user's picks and calculate wins/losses
      for (const week of weeks) {
        const pickRes = await apiClient.get<{
          success: boolean;
          data?: {
            selections: Record<string, string>;
            outcomes?: Record<string, boolean | null>;
            isFinalized?: boolean;
          } | null;
        }>(`picks/${week}`);

        if (
          pickRes.success &&
          pickRes.data?.isFinalized &&
          pickRes.data.outcomes
        ) {
          const outcomes = pickRes.data.outcomes;
          const wins = Object.values(outcomes).filter(
            (outcome) => outcome === true
          ).length;
          const losses = Object.values(outcomes).filter(
            (outcome) => outcome === false
          ).length;

          totalWins += wins;
          totalLosses += losses;
        }
      }

      const totalGames = totalWins + totalLosses;
      const percentage = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;

      setSeasonRecord({
        wins: totalWins,
        losses: totalLosses,
        percentage: percentage,
      });
    } catch (error) {
      // Keep default values on error
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      // Don't fetch data if user is not authenticated
      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // First, get the summary, games, and weeks-with-finalized-picks
        const [summaryRes, gamesRes, weeksRes] = await Promise.all([
          dashboardApi.getSummary(),
          apiClient.get<{ success: boolean; data?: any[] }>("games"),
          apiClient.get<{ success: boolean; data?: number[] }>("picks/weeks"),
        ]);

        if (summaryRes.success) {
          setSummary(summaryRes.data);
        }

        const gameList = Array.isArray(gamesRes.data)
          ? (gamesRes.data as any[])
          : [];
        setGames(gameList);

        const upcomingWeek = (() => {
          if (
            summaryRes.success &&
            summaryRes.data.upcomingGames &&
            summaryRes.data.upcomingGames.length > 0
          ) {
            const parsed = parseInt(summaryRes.data.upcomingGames[0].gameWeek);
            return isNaN(parsed) ? null : parsed;
          }
          return null;
        })();

        // Helper to parse combined game date and time into a JS Date
        const parseGameDateTime = (gd?: string, gt?: string) => {
          if (!gd || !gt) return null;
          try {
            const yyyy = Number(gd.slice(0, 4));
            const mm = Number(gd.slice(4, 6));
            const dd = Number(gd.slice(6, 8));
            const m = gt.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])/i);
            let hours = 12;
            let minutes = 0;
            if (m) {
              hours = Number(m[1]);
              minutes = m[2] ? Number(m[2]) : 0;
              const mer = m[3].toLowerCase();
              if (mer === "p" && hours !== 12) hours += 12;
              if (mer === "a" && hours === 12) hours = 0;
            }
            return new Date(yyyy, mm - 1, dd, hours, minutes, 0, 0);
          } catch {
            return null;
          }
        };

        // Determine per-game status
        const getGameStatus = (game: { gameTime: string; gameStatus?: string; gameStatusCode?: string; gameDate?: string; gameTimeEpoch?: string }) => {
          if (game.gameStatus) {
            const status = game.gameStatus.toLowerCase();
            if (
              status.includes("final") ||
              status.includes("completed") ||
              status.includes("finished")
            ) {
              return "completed" as const;
            }
            if (
              status.includes("in_progress") ||
              status.includes("live") ||
              status.includes("active")
            ) {
              return "in_progress" as const;
            }
            if (
              status.includes("scheduled") ||
              status.includes("upcoming") ||
              status.includes("pre")
            ) {
              return "scheduled" as const;
            }
          }
          if (game.gameStatusCode) {
            const code = game.gameStatusCode.toLowerCase();
            if (code.includes("final")) return "completed" as const;
          }
          const now = new Date();
          const epochMs = (() => {
            const e = game.gameTimeEpoch ? Number(game.gameTimeEpoch) : NaN;
            return Number.isFinite(e) && e > 0 ? e * 1000 : NaN;
          })();
          const dt = Number.isFinite(epochMs)
            ? new Date(epochMs)
            : parseGameDateTime(game.gameDate as string, game.gameTime as string) ||
              new Date(game.gameTime);
          if (dt > now) return "scheduled" as const;
          const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
          if (dt > sixHoursAgo) return "in_progress" as const;
          return "completed" as const;
        };

        const weekNumbersFromGames = gameList
          .map((g) => (g.gameWeek || "").match(/\d+/)?.[0])
          .filter((n): n is string => Boolean(n))
          .map((n) => Number(n))
          .filter((n) => !Number.isNaN(n));
        const uniqueWeeksFromGames = [...new Set(weekNumbersFromGames)].sort(
          (a, b) => a - b
        );

        // Choose the first week with any game not completed; fallback to max week or upcoming
        const firstActiveWeek = uniqueWeeksFromGames.find((wk) => {
          const gamesForWeek = gameList.filter((g) => {
            const num = Number((g.gameWeek || "").match(/\d+/)?.[0] ?? NaN);
            return !Number.isNaN(num) && num === wk;
          });
          if (!gamesForWeek.length) return false;
          return !gamesForWeek.every((g) => getGameStatus(g as any) === "completed");
        });

        // Determine last fully completed week from games only (not picks)
        const completedWeeks = uniqueWeeksFromGames.filter((wk) => {
          const gamesForWeek = gameList.filter((g) => {
            const num = Number((g.gameWeek || "").match(/\d+/)?.[0] ?? NaN);
            return !Number.isNaN(num) && num === wk;
          });
          if (!gamesForWeek.length) return false;
          const allCompletedByStatus = gamesForWeek.every(
            (g) => getGameStatus(g as any) === "completed"
          );
          if (allCompletedByStatus) return true;
          // Fallback: if the latest kickoff in the week was more than 8 hours ago, consider week completed
          const latestKick = gamesForWeek
            .map((g) => {
              const e = g.gameTimeEpoch ? Number(g.gameTimeEpoch) * 1000 : NaN;
              const dt = Number.isFinite(e)
                ? new Date(e)
                : parseGameDateTime(g.gameDate as string, g.gameTime as string);
              return dt ? dt.getTime() : 0;
            })
            .reduce((a, b) => Math.max(a, b), 0);
          if (!latestKick) return false;
          const eightHoursAgo = Date.now() - 8 * 60 * 60 * 1000;
          return latestKick < eightHoursAgo;
        });
        const lastCompletedWeek =
          completedWeeks.length > 0 ? Math.max(...completedWeeks) : 0;

        // Target week is strictly the week after the last fully completed week, if present
        const nextWeekCandidate = lastCompletedWeek + 1;
        const hasNextWeekInSchedule = uniqueWeeksFromGames.includes(nextWeekCandidate);

        const computedCurrentWeek = (() => {
          // Only advance to lastCompleted + 1 if at least one full week is completed
          if (lastCompletedWeek > 0 && hasNextWeekInSchedule)
            return nextWeekCandidate;
          if (firstActiveWeek != null) return firstActiveWeek;
          if (uniqueWeeksFromGames.length > 0) return Math.max(...uniqueWeeksFromGames);
          return upcomingWeek ?? 1;
        })();

        setCurrentWeek(computedCurrentWeek);

        // Now fetch pick data for the computed current week
        const pickRes = await dashboardApi.getMyPick(computedCurrentWeek);
        if (pickRes.success) {
          setUserPick(pickRes.data);
          if (pickRes.data?.touchdownScorer) {
            const name = await getPlayerName(pickRes.data.touchdownScorer);
            setPlayerName(name);
          }
        }

        // Populate history weeks from finalized picks
        const weeksWithPicks = Array.isArray(weeksRes.data)
          ? ((weeksRes.data as number[]).sort((a, b) => a - b))
          : [];
        setHistoryWeeks(weeksWithPicks);
        const defaultHistoryWeek = weeksWithPicks.length
          ? Math.max(...weeksWithPicks)
          : null;
        setSelectedHistoryWeek(defaultHistoryWeek);
        if (defaultHistoryWeek != null) {
          const histRes = await dashboardApi.getMyPick(defaultHistoryWeek);
          if (histRes.success) {
            setHistoryPick(histRes.data);
          }
        }

        // Fetch leaderboard data
        const leaderboardRes = await dashboardApi.getLeaderboard();
        if (leaderboardRes.success) {
          setLeaderboard(leaderboardRes.data);
        }

        // Calculate season record from actual picks data
        await calculateSeasonRecord();

        // No fallback needed; we explicitly set current week and fetched Week 1 history
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard data"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]); // Re-run when currentUser changes

  // Fetch player name when userPick changes
  useEffect(() => {
    const fetchPlayerName = async () => {
      if (userPick?.touchdownScorer && !playerName) {
        const name = await getPlayerName(userPick.touchdownScorer);
        setPlayerName(name);
      }
    };
    fetchPlayerName();
  }, [userPick, playerName]);

  // Get current user's picks for this week
  const hasSubmittedPicks = userPick && userPick.isFinalized;

  // Calculate user's position in leaderboard
  const userPosition =
    leaderboard.findIndex((entry) => entry.user === currentUser?.id) + 1;

  // Calculate next game time
  // const nextGame = currentWeekGames
  //   .filter((game) => new Date(game.gameTime) > new Date())
  //   .sort(
  //     (a, b) => new Date(a.gameTime).getTime() - new Date(b.gameTime).getTime()
  //   )[0];

  // const formatGameTime = (gameTime: string) => {
  //   return new Date(gameTime).toLocaleDateString("en-US", {
  //     weekday: "short",
  //     month: "short",
  //     day: "numeric",
  //     hour: "numeric",
  //     minute: "2-digit",
  //   });
  // };

  // Show loading while authentication is being checked
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Please log in to view your dashboard.
          </p>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            You need to be logged in to access the dashboard.
          </p>
          <Button asChild>
            <Link to="/login">Go to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {currentUser?.name}!
          </p>
        </div>
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">Error loading dashboard: {error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {currentUser?.name}! Here's your NFL picks overview.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Season Record</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {seasonRecord.wins}-{seasonRecord.losses}
            </div>
            <p className="text-xs text-muted-foreground">
              {seasonRecord.percentage.toFixed(1)}% win rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Wins</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentUser?.weeklyWins}</div>
            <p className="text-xs text-muted-foreground">This season</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Week {currentWeek}</div>
            <p className="text-xs text-muted-foreground">
              {(() => {
                const gamesForWeek = games.filter((g) => {
                  const num = Number((g.gameWeek || "").match(/\d+/)?.[0] ?? NaN);
                  return !Number.isNaN(num) && num === currentWeek;
                });
                if (gamesForWeek.length) return `${gamesForWeek.length} games`;
                return `${summary?.upcomingGames?.length ?? 0} games`;
              })()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leaderboard</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#{userPosition || "N/A"}</div>
            <p className="text-xs text-muted-foreground">Current position</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Week Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Week {currentWeek} Status
              </div>
              {hasSubmittedPicks && (
                <div className="flex items-center justify-end">
                  <Badge variant="default">Submitted</Badge>
                </div>
              )}
            </CardTitle>

            <CardDescription>Your picks for this week</CardDescription>
            {userPick && !userPick.isFinalized && (
              <div className="pt-2 text-sm text-muted-foreground">
                <p>
                  Picks are in progress. Time remaining to submit: 2d 4h 15m
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {hasSubmittedPicks ? (
              <div className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Spread Picks:</span>
                    <span>
                      {userPick
                        ? Object.keys(userPick.selections || {}).length
                        : 0}{" "}
                      submitted
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lock of Week:</span>
                    <span>{userPick?.lockOfWeek || "Not submitted"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TD Scorer:</span>
                    <span>
                      {playerName ||
                        userPick?.touchdownScorer ||
                        "Not submitted"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Prop Bet:</span>
                    <Badge variant="outline" className="text-xs">
                      {userPick?.propBet || "Not submitted"}
                    </Badge>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link to={`/picks?week=${currentWeek}`}>View/Edit Picks</Link>
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2" />
                  <p>
                    You haven't submitted your picks for Week {currentWeek} yet.
                  </p>
                </div>
                <Button asChild className="w-full">
                  <Link to={`/picks?week=${currentWeek}`}>Make Your Picks</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pick History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Pick History
          </CardTitle>
          <CardDescription>View submitted picks from previous weeks</CardDescription>
        </CardHeader>
        <CardContent>
          {historyWeeks.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="history-week" className="text-sm text-muted-foreground">
                  Week
                </Label>
                <Select
                  value={selectedHistoryWeek?.toString() || ""}
                  onValueChange={async (v) => {
                    const n = Number(v);
                    setSelectedHistoryWeek(n);
                    const res = await dashboardApi.getMyPick(n);
                    if (res.success) {
                      setHistoryPick(res.data);
                    } else {
                      setHistoryPick(null);
                    }
                  }}
                >
                  <SelectTrigger id="history-week" className="w-28">
                    <SelectValue placeholder="Week" />
                  </SelectTrigger>
                  <SelectContent>
                    {historyWeeks.map((w) => (
                      <SelectItem key={w} value={w.toString()}>
                        Week {w}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {historyPick && historyPick.isFinalized ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Spread Picks:</span>
                    <span>
                      {Object.keys(historyPick.selections || {}).length} submitted
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lock of Week:</span>
                    <span>{historyPick.lockOfWeek || "Not submitted"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TD Scorer:</span>
                    <span>
                      {historyPick.touchdownScorerName ||
                        historyPick.touchdownScorer ||
                        "Not submitted"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Prop Bet:</span>
                    <Badge variant="outline" className="text-xs">
                      {historyPick.propBet || "Not submitted"}
                    </Badge>
                  </div>
                  <div className="pt-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/results?week=${selectedHistoryWeek ?? ""}`}>
                        View Results
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No finalized picks found for this week.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No history available yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
