import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  Target,
  TrendingUp,
  Calendar,
  Medal,
  Crown,
  Star,
  Award,
} from "lucide-react";
import { users, weeklyResults, scoringSystem } from "../data/mockData";

const Leaderboard = () => {
  // Calculate season standings
  const seasonStandings = users
    .map((user) => ({
      ...user,
      totalPoints: weeklyResults.reduce((total, week) => {
        const userResult = week.results.find((r) => r.userId === user.id);
        return total + (userResult ? userResult.totalPoints : 0);
      }, 0),
      weeklyWins: weeklyResults.filter((week) => week.winner.id === user.id)
        .length,
      averagePoints:
        weeklyResults.length > 0
          ? weeklyResults.reduce((total, week) => {
              const userResult = week.results.find((r) => r.userId === user.id);
              return total + (userResult ? userResult.totalPoints : 0);
            }, 0) / weeklyResults.length
          : 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <Star className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getRankBadgeVariant = (rank: number) => {
    switch (rank) {
      case 1:
        return "default";
      case 2:
        return "secondary";
      case 3:
        return "outline";
      default:
        return "outline";
    }
  };

  // Get weekly breakdown data
  const weeklyBreakdown = weeklyResults
    .map((week) => ({
      ...week,
      allResults: users
        .map((user) => {
          const result = week.results.find((r) => r.userId === user.id);
          return {
            user,
            result: result || {
              userId: user.id,
              correctPicks: 0,
              totalPoints: 0,
              lockCorrect: false,
              tdScorerCorrect: false,
              propBetCorrect: false,
            },
          };
        })
        .sort((a, b) => b.result.totalPoints - a.result.totalPoints),
    }))
    .reverse(); // Show most recent first

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Leaderboard</h1>
        <p className="text-muted-foreground mt-1">
          Season standings and weekly results
        </p>
      </div>

      <Tabs defaultValue="season" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="season">Season Standings</TabsTrigger>
          <TabsTrigger value="weekly">Weekly Results</TabsTrigger>
        </TabsList>

        {/* Season Standings */}
        <TabsContent value="season" className="space-y-6">
          {/* Overall Standings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Season Standings
              </CardTitle>
              <CardDescription>
                Overall leaderboard based on total points earned
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {seasonStandings.map((user, index) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getRankIcon(index + 1)}
                        <Badge
                          variant={getRankBadgeVariant(index + 1)}
                          className="min-w-8 justify-center"
                        >
                          #{index + 1}
                        </Badge>
                      </div>
                      <div>
                        <div className="font-semibold text-lg">{user.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.weeklyWins} weekly wins •{" "}
                          {user.averagePoints.toFixed(1)} avg points
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {user.totalPoints}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        total points
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Season Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Most Weekly Wins
                </CardTitle>
                <Crown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {seasonStandings[0]?.name}
                </div>
                <p className="text-xs text-muted-foreground">
                  {seasonStandings[0]?.weeklyWins} wins
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Highest Average
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {
                    seasonStandings.sort(
                      (a, b) => b.averagePoints - a.averagePoints
                    )[0]?.name
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  {seasonStandings
                    .sort((a, b) => b.averagePoints - a.averagePoints)[0]
                    ?.averagePoints.toFixed(1)}{" "}
                  avg
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Best Win Rate
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {
                    users.sort(
                      (a, b) =>
                        b.seasonRecord.percentage - a.seasonRecord.percentage
                    )[0]?.name
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  {(
                    users.sort(
                      (a, b) =>
                        b.seasonRecord.percentage - a.seasonRecord.percentage
                    )[0]?.seasonRecord.percentage * 100
                  ).toFixed(1)}
                  %
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Scoring System */}
          <Card>
            <CardHeader>
              <CardTitle>Scoring System</CardTitle>
              <CardDescription>
                How points are awarded each week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted">
                  <div className="text-2xl font-bold">
                    {scoringSystem.correctPick}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Correct Pick
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <div className="text-2xl font-bold">
                    {scoringSystem.correctLockOfWeek}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Lock of Week
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <div className="text-2xl font-bold">
                    {scoringSystem.correctTouchdownScorer}
                  </div>
                  <div className="text-sm text-muted-foreground">TD Scorer</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <div className="text-2xl font-bold">
                    {scoringSystem.correctPropBet}
                  </div>
                  <div className="text-sm text-muted-foreground">Prop Bet</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weekly Results */}
        <TabsContent value="weekly" className="space-y-6">
          <div className="space-y-6">
            {weeklyBreakdown.map((week) => (
              <Card key={week.week}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Week {week.week}
                      </CardTitle>
                      <CardDescription>
                        Weekly results and standings
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span className="font-semibold">{week.winner.name}</span>
                      <Badge variant="default">Winner</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {week.allResults.map((entry, index) => (
                      <div
                        key={entry.user.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={index === 0 ? "default" : "outline"}
                            className="min-w-8 justify-center"
                          >
                            #{index + 1}
                          </Badge>
                          <div>
                            <div className="font-medium">{entry.user.name}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-4">
                              <span>
                                {entry.result.correctPicks} correct picks
                              </span>
                              {entry.result.lockCorrect && (
                                <Badge variant="outline" className="text-xs">
                                  Lock ✓
                                </Badge>
                              )}
                              {entry.result.tdScorerCorrect && (
                                <Badge variant="outline" className="text-xs">
                                  TD ✓
                                </Badge>
                              )}
                              {entry.result.propBetCorrect && (
                                <Badge variant="outline" className="text-xs">
                                  Prop ✓
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold">
                            {entry.result.totalPoints}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            points
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Leaderboard;
