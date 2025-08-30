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
  Check,
  X,
} from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
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
  const recentResults = weeklyResults.slice(0, 6);

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
            {userPicks && !userPicks.isFinalized && (
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
                      {userPicks.picks.length} / {currentWeekGames.length} games
                      submitted
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lock of Week:</span>
                    <span>
                      {userPicks.lockOfWeek.selectedTeam
                        ? userPicks.lockOfWeek.selectedTeam
                        : "Not submitted"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>TD Scorer:</span>
                    <span>
                      {userPicks.touchdownScorer.playerName
                        ? userPicks.touchdownScorer.playerName
                        : "Not submitted"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Prop Bet:</span>
                    <Badge variant="outline" className="text-xs">
                      {userPicks.propBet.status
                        ? userPicks.propBet.status
                        : "Not submitted"}
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
          <Tabs defaultValue="all" className="w-full">
            <TabsContent value="all">
              <div className="space-y-4">
                {recentResults.map((result) => {
                  const userResult = result.results.find(
                    (r) => r.userId === currentUser?.id
                  );

                  // Sort results by total points to determine user's position
                  const sortedResults = [...result.results].sort(
                    (a, b) => b.totalPoints - a.totalPoints
                  );
                  const userRank = sortedResults.findIndex(
                    (r) => r.userId === currentUser?.id
                  );

                  // Determine position and badge variant
                  let positionBadge = null;
                  if (userRank === 0) {
                    positionBadge = (
                      <Badge
                        variant="default"
                        className="text-xs bg-green-700 text-white"
                      >
                        Winner
                      </Badge>
                    );
                  } else if (userRank === 1) {
                    positionBadge = (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-amber-700 text-white"
                      >
                        Second
                      </Badge>
                    );
                  } else if (userRank === sortedResults.length - 1) {
                    positionBadge = (
                      <Badge
                        variant="destructive"
                        className="text-xs bg-red-700 text-white"
                      >
                        Loser
                      </Badge>
                    );
                  } else {
                    positionBadge = (
                      <Badge
                        variant="outline"
                        className="text-xs bg-gray-700 text-white"
                      >
                        #{userRank + 1}
                      </Badge>
                    );
                  }

                  return (
                    <div
                      key={result.week}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium">
                          Week {result.week}
                        </div>
                        {positionBadge}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {userResult?.totalPoints} points
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {userResult?.correctPicks} correct picks /{" "}
                          {currentWeekGames.length} total
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            Lock
                          </span>
                          {userResult?.lockCorrect ? (
                            <span className="text-xs text-green-600">
                              <Check />
                            </span>
                          ) : (
                            <span className="text-xs text-red-600">
                              <X />
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            TD
                          </span>
                          {userResult?.tdScorerCorrect ? (
                            <span className="text-xs text-green-600">
                              <Check />
                            </span>
                          ) : (
                            <span className="text-xs text-red-600">
                              <X />
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Prop
                          </span>
                          {userResult?.propBetCorrect ? (
                            <span className="text-green-600">
                              <Check />
                            </span>
                          ) : (
                            <span className="text-red-600">
                              <X />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
            <TabsContent value="second">
              <div className="space-y-4">
                {recentResults
                  .map((result) => {
                    // Sort results by total points to find second place
                    const sortedResults = [...result.results].sort(
                      (a, b) => b.totalPoints - a.totalPoints
                    );
                    const secondPlace = sortedResults[1]; // Second place (index 1)
                    const isSecondPlace =
                      secondPlace && secondPlace.userId === currentUser?.id;

                    // Only show weeks where current user is second place
                    if (!isSecondPlace) return null;

                    return {
                      week: result.week,
                      result: secondPlace,
                      isSecondPlace: true,
                    };
                  })
                  .filter(
                    (item): item is NonNullable<typeof item> => item !== null
                  ) // Remove null entries
                  .map((item) => (
                    <div
                      key={item.week}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium">
                          Week {item.week}
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-xs bg-amber-700 text-white"
                        >
                          Second
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {item.result.totalPoints} points
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.result.correctPicks} correct picks /{" "}
                          {currentWeekGames.length} total
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            Lock
                          </span>
                          {item.result.lockCorrect ? (
                            <span className="text-xs text-green-600">
                              <Check />
                            </span>
                          ) : (
                            <span className="text-xs text-red-600">
                              <X />
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            TD
                          </span>
                          {item.result.tdScorerCorrect ? (
                            <span className="text-xs text-green-600">
                              <Check />
                            </span>
                          ) : (
                            <span className="text-xs text-red-600">
                              <X />
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Prop
                          </span>
                          {item.result.propBetCorrect ? (
                            <span className="text-xs text-green-600">
                              <Check />
                            </span>
                          ) : (
                            <span className="text-xs text-red-600">
                              <X />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                {recentResults
                  .map((result) => {
                    const sortedResults = [...result.results].sort(
                      (a, b) => b.totalPoints - a.totalPoints
                    );
                    const secondPlace = sortedResults[1];
                    const isSecondPlace =
                      secondPlace && secondPlace.userId === currentUser?.id;
                    return isSecondPlace;
                  })
                  .filter(Boolean).length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <p>You haven't finished in second in recent weeks.</p>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="loser">
              <div className="space-y-4">
                {recentResults
                  .map((result) => {
                    // Sort results by total points to find last place
                    const sortedResults = [...result.results].sort(
                      (a, b) => b.totalPoints - a.totalPoints
                    );
                    const lastPlace = sortedResults[sortedResults.length - 1]; // Last place
                    const isLastPlace =
                      lastPlace && lastPlace.userId === currentUser?.id;

                    // Only show weeks where current user is last place
                    if (!isLastPlace) return null;

                    return {
                      week: result.week,
                      result: lastPlace,
                      isLastPlace: true,
                    };
                  })
                  .filter(
                    (item): item is NonNullable<typeof item> => item !== null
                  ) // Remove null entries
                  .map((item) => (
                    <div
                      key={item.week}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium">
                          Week {item.week}
                        </div>
                        <Badge
                          variant="destructive"
                          className="text-xs bg-red-700 text-white"
                        >
                          Loser
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {item.result.totalPoints} points
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.result.correctPicks} correct picks /{" "}
                          {currentWeekGames.length} total
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            Lock
                          </span>
                          {item.result.lockCorrect ? (
                            <span className="text-xs text-green-600">
                              <Check />
                            </span>
                          ) : (
                            <span className="text-xs text-red-600">
                              <X />
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            TD
                          </span>
                          {item.result.tdScorerCorrect ? (
                            <span className="text-xs text-green-600">
                              <Check />
                            </span>
                          ) : (
                            <span className="text-xs text-red-600">
                              <X />
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Prop
                          </span>
                          {item.result.propBetCorrect ? (
                            <span className="text-xs text-green-600">
                              <Check />
                            </span>
                          ) : (
                            <span className="text-xs text-red-600">
                              <X />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                {recentResults
                  .map((result) => {
                    const sortedResults = [...result.results].sort(
                      (a, b) => b.totalPoints - a.totalPoints
                    );
                    const lastPlace = sortedResults[sortedResults.length - 1];
                    const isLastPlace =
                      lastPlace && lastPlace.userId === currentUser?.id;
                    return isLastPlace;
                  })
                  .filter(Boolean).length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <p>You haven't finished in loser in recent weeks.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
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
