import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,

  TrendingUp,
  Calendar,
  Medal,
  Crown,
  Star,
  Award,
} from "lucide-react";
import { useEffect } from "react";
import { apiClient } from "@/lib/api";

const Leaderboard = () => {
  type Row = { user: string; wins: number; losses: number; winPct: number };
  const [seasonStandings, setSeasonStandings] = useState<Row[]>([]);
  useEffect(() => {
    apiClient
      .get<{ success?: boolean; data?: Row[] }>("leaderboard")
      .then((res) => setSeasonStandings(Array.isArray(res?.data) ? (res.data as Row[]) : []))
      .catch(() => setSeasonStandings([]));
  }, []);

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
    if (rank === 1) return "default";
    if (rank === 2) return "secondary";
    if (rank === 3) return "outline";
    return "outline";
  };

  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  const toggleWeekExpansion = (week: number) => {
    setExpandedWeek(expandedWeek === week ? null : week);
  };

  // Weekly breakdown removed for now (no API yet)
  const weeklyBreakdown: Array<{ week: number; allResults: any[]; winner: any }> = [];

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
                    key={`${String(user.user)}-${index}`}
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
                        <div className="font-semibold text-lg">{String(user.user).slice(0, 6)}</div>
                        <div className="text-sm text-muted-foreground">{user.winPct.toFixed(2)}% win rate</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{user.wins}</div>
                      <div className="text-sm text-muted-foreground">wins</div>
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
                  {seasonStandings[0] ? String(seasonStandings[0].user).slice(0, 6) : ""}
                </div>
                <p className="text-xs text-muted-foreground">
                  {seasonStandings[0]?.wins ?? 0} wins
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
                  {seasonStandings.slice().sort((a, b) => b.winPct - a.winPct)[0]?.user}
                </div>
                <p className="text-xs text-muted-foreground">
                  {(seasonStandings.slice().sort((a, b) => b.winPct - a.winPct)[0]?.winPct ?? 0).toFixed(2)} win %
                </p>
              </CardContent>
            </Card>


          </div>

            {/* Scoring System removed (no static mock) */}

            {/* User Stats Summary */}
            <Card>
              <CardHeader>
                <CardTitle>User Stats Summary</CardTitle>
                <CardDescription>
                  Pick percentages for each user
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {seasonStandings.map((user, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <img src="/user_avatar.png" alt="User Avatar" className="h-8 w-8 rounded-full" />
                        <div className="font-medium">{String(user.user).slice(0, 6)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{user.winPct.toFixed(2)}%</div>
                        <div className="text-xs text-muted-foreground">Overall Pick %</div>
                      </div>
                    </div>
                  ))}
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
                    <Button variant="ghost" size="sm" onClick={() => toggleWeekExpansion(week.week)}>
                      {expandedWeek === week.week ? "Collapse" : "Expand"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {expandedWeek === week.week && (
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
                  )}
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