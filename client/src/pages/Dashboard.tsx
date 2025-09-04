import { useAuth } from "../contexts/useAuth";
import { useEffect, useState } from "react";
import { dashboardApi } from "@/lib/api";
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
  const { currentUser } = useAuth();
  const [currentWeek, setCurrentWeek] = useState<number>(1);
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

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // First, get the summary to determine current week
        const summaryRes = await dashboardApi.getSummary();

        if (summaryRes.success) {
          setSummary(summaryRes.data);
          // Determine current week from upcoming games
          if (
            summaryRes.data.upcomingGames &&
            summaryRes.data.upcomingGames.length > 0
          ) {
            const weekFromGames = parseInt(
              summaryRes.data.upcomingGames[0].gameWeek
            );
            if (!isNaN(weekFromGames)) {
              setCurrentWeek(weekFromGames);
              // Now fetch pick data for the correct week
              const pickRes = await dashboardApi.getMyPick(weekFromGames);
              console.log("Pick data for week", weekFromGames, ":", pickRes);
              if (pickRes.success) {
                setUserPick(pickRes.data);
                // If there's a touchdown scorer, fetch the player name
                if (pickRes.data?.touchdownScorer) {
                  const name = await getPlayerName(
                    pickRes.data.touchdownScorer
                  );
                  setPlayerName(name);
                }
              }
            }
          }
        }

        // Fetch leaderboard data
        const leaderboardRes = await dashboardApi.getLeaderboard();
        if (leaderboardRes.success) {
          setLeaderboard(leaderboardRes.data);
        }

        // If we still don't have pick data, try fetching for week 1 directly
        if (!userPick) {
          console.log("No pick data found, trying week 1 directly...");
          const fallbackPickRes = await dashboardApi.getMyPick(1);
          console.log("Fallback pick data for week 1:", fallbackPickRes);
          if (fallbackPickRes.success) {
            setUserPick(fallbackPickRes.data);
            setCurrentWeek(1);
            // If there's a touchdown scorer, fetch the player name
            if (fallbackPickRes.data?.touchdownScorer) {
              const name = await getPlayerName(
                fallbackPickRes.data.touchdownScorer
              );
              setPlayerName(name);
            }
          }
        }
      } catch (err: unknown) {
        console.error("Error fetching dashboard data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard data"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array is intentional - we only want to run this once on mount

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
              {currentUser?.seasonRecord.wins}-
              {currentUser?.seasonRecord.losses}
            </div>
            <p className="text-xs text-muted-foreground">
              {(currentUser?.seasonRecord.percentage ?? 0 * 100).toFixed(1)}%
              win rate
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
              {summary?.upcomingGames?.length ?? 0} games
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
                  <Link to="/picks">View/Edit Picks</Link>
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
                  <Link to="/picks">Make Your Picks</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Results - Placeholder for now */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Results
          </CardTitle>
          <CardDescription>Your performance in recent weeks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>
              Historical results will be available once games are completed and
              scored.
            </p>
            <div className="mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link to="/leaderboard">View Leaderboard</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
