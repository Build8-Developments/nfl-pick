import { useAuth } from "../contexts/useAuth";
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
import {
  users,
  currentWeekGames,
  mockUserPicks,
  weeklyResults,
} from "../data/mockData";

const Dashboard = () => {
  const { currentUser } = useAuth();
  const currentWeek = 10;

  // Get current user's picks for this week
  const userPicks = mockUserPicks.find(
    (pick) => pick.userId === currentUser?.id
  );
  const hasSubmittedPicks = userPicks && userPicks.isFinalized;

  // Get recent results
  const recentResults = weeklyResults.slice(0, 3);

  // Calculate next game time
  const nextGame = currentWeekGames
    .filter((game) => new Date(game.gameTime) > new Date())
    .sort(
      (a, b) => new Date(a.gameTime).getTime() - new Date(b.gameTime).getTime()
    )[0];

  const formatGameTime = (gameTime: string) => {
    return new Date(gameTime).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

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
              {currentWeekGames.length} games
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leaderboard</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              #{users.findIndex((u) => u.id === currentUser?.id) + 1}
            </div>
            <p className="text-xs text-muted-foreground">Current position</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Week Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Week {currentWeek} Status
            </CardTitle>
            <CardDescription>Your picks for this week</CardDescription>
          </CardHeader>
          <CardContent>
            {hasSubmittedPicks ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Picks Status</span>
                  <Badge variant="default">Submitted</Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Spread Picks:</span>
                    <span>{userPicks.picks.length} games</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lock of Week:</span>
                    <span>{userPicks.lockOfWeek.selectedTeam}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TD Scorer:</span>
                    <span>{userPicks.touchdownScorer.playerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Prop Bet:</span>
                    <Badge variant="outline" className="text-xs">
                      {userPicks.propBet.status}
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Next Game
            </CardTitle>
            <CardDescription>Upcoming game information</CardDescription>
          </CardHeader>
          <CardContent>
            {nextGame ? (
              <div className="space-y-3">
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    {nextGame.awayTeam?.abbreviation} @{" "}
                    {nextGame.homeTeam?.abbreviation}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {nextGame.homeTeam?.name}{" "}
                    {nextGame.spread && nextGame.spread > 0 ? "+" : ""}
                    {nextGame.spread}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">
                    {formatGameTime(nextGame.gameTime)}
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground text-center">
                    Make sure to submit your picks before kickoff!
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <p>No upcoming games this week</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Results
          </CardTitle>
          <CardDescription>Your performance in recent weeks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentResults.map((result) => {
              const userResult = result.results.find(
                (r) => r.userId === currentUser?.id
              );
              const isWinner = result.winner.id === currentUser?.id;

              return (
                <div
                  key={result.week}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium">
                      Week {result.week}
                    </div>
                    {isWinner && (
                      <Badge variant="default" className="text-xs">
                        Winner
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {userResult?.totalPoints} points
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {userResult?.correctPicks} correct picks
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link to="/leaderboard">View Full History</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
