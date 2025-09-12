import { useState, useEffect, useCallback } from "react";
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
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { getUserAvatar, preloadAvatars } from "@/lib/avatarUtils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { IGame } from "@/types/game.type";

const Leaderboard = () => {
  // Enhanced types for real data
  type SeasonRow = {
    user: string;
    username: string;
    avatar?: string;
    wins: number;
    losses: number;
    winPct: number;
    totalPoints?: number;
    fantasyPoints?: number;
    email?: string;
    role?: string;
  };

  type WeeklyRow = {
    user: string;
    username: string;
    avatar?: string;
    totalPoints: number;
    fantasyPoints: number;
    correctPicks: number;
    totalPicks: number;
    winPercentage: number;
  };

  const [seasonStandings, setSeasonStandings] = useState<SeasonRow[]>([]);
  const [weeklyStandings, setWeeklyStandings] = useState<WeeklyRow[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);

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
    const firstThursday = new Date(september.getTime() + daysToThursday * 24 * 60 * 60 * 1000);
    return firstThursday;
  };

  const computeCurrentWeek = (season: number) => {
    const start = getSeasonStartDate(season);
    const now = new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const diffWeeks = Math.floor((now.getTime() - start.getTime()) / msPerWeek);
    // Week indexing starts at 1; clamp between 1 and 18 for regular season
    return Math.min(Math.max(diffWeeks + 1, 1), 18);
  };

  // Load available weeks and current week
  useEffect(() => {
    const loadWeeks = async () => {
      try {
        const [weeksRes, gamesRes] = await Promise.all([
          apiClient.get<{ success: boolean; data?: number[] }>("picks/weeks"),
          apiClient.get<{ success: boolean; data?: IGame[] }>("games"),
        ]);

        const weeks = Array.isArray(weeksRes.data) ? weeksRes.data : [];
        const games = Array.isArray(gamesRes.data) ? gamesRes.data : [];

        // Extract weeks from games data
        const gameWeeks = games
          .map((g) => g.gameWeek)
          .map((w) => (typeof w === "string" ? w.match(/\d+/)?.[0] : undefined))
          .filter((n): n is string => Boolean(n))
          .map((n) => Number(n))
          .filter((n) => !Number.isNaN(n));

        const allWeeks = [...new Set([...weeks, ...gameWeeks])].sort(
          (a, b) => a - b
        );
        setAvailableWeeks(allWeeks);

        // Calculate the actual current NFL week
        const currentSeason = getCurrentSeason();
        const computedCurrentWeek = computeCurrentWeek(currentSeason);
        
        // Default to computed current week (or first available week if current week doesn't exist)
        if (allWeeks.length > 0) {
          const defaultWeek = allWeeks.includes(computedCurrentWeek) ? computedCurrentWeek : allWeeks[0];
          setSelectedWeek(defaultWeek);
        }
      } catch (err) {
        console.error("Error loading weeks:", err);
        setError("Failed to load available weeks");
      }
    };

    loadWeeks();
  }, []);

  // Load season standings
  const loadSeasonStandings = useCallback(async () => {
    try {
      setError(null);
      const res = await apiClient.get<{
        success?: boolean;
        data?: SeasonRow[];
      }>("leaderboard");
      const data = Array.isArray(res?.data) ? (res.data as SeasonRow[]) : [];
      setSeasonStandings(data);

      // If no data, show a helpful message
      // If no data, silently keep empty state
    } catch (err) {
      console.error("Error loading season standings:", err);
      setError(
        "Failed to load season standings. The database might be empty or there's a connection issue."
      );
      setSeasonStandings([]);
    }
  }, []);

  // Load weekly standings
  const loadWeeklyStandings = useCallback(async (week: number) => {
    try {
      setError(null);
      const res = await apiClient.get<{
        success?: boolean;
        data?: WeeklyRow[];
      }>(`live-scoring/leaderboard?week=${week}&season=2025`);
      const data = Array.isArray(res?.data) ? (res.data as WeeklyRow[]) : [];
      setWeeklyStandings(data);

      // If no data, show a helpful message
      // If no data, silently keep empty state
    } catch (err) {
      console.error("Error loading weekly standings:", err);
      setError(
        "Failed to load weekly standings. No scoring data available for this week."
      );
      setWeeklyStandings([]);
    }
  }, []);

  // Load data on mount and when week changes
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        loadSeasonStandings(),
        selectedWeek ? loadWeeklyStandings(selectedWeek) : Promise.resolve(),
      ]);
      setLoading(false);
    };

    loadData();
  }, [selectedWeek, loadSeasonStandings, loadWeeklyStandings]);

  // Real-time updates via polling
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedWeek) {
        loadWeeklyStandings(selectedWeek);
        setJustUpdated(true);
        setTimeout(() => setJustUpdated(false), 2000);
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [selectedWeek, loadWeeklyStandings]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadSeasonStandings(),
      selectedWeek ? loadWeeklyStandings(selectedWeek) : Promise.resolve(),
    ]);
    setIsRefreshing(false);
    setJustUpdated(true);
    setTimeout(() => setJustUpdated(false), 2000);
  };

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

  // Preload avatars when data changes
  useEffect(() => {
    if (seasonStandings.length > 0) {
      const avatars = seasonStandings.map(user => user.avatar);
      preloadAvatars(avatars);
    }
  }, [seasonStandings]);

  useEffect(() => {
    if (weeklyStandings.length > 0) {
      const avatars = weeklyStandings.map(user => user.avatar);
      preloadAvatars(avatars);
    }
  }, [weeklyStandings]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leaderboard</h1>
          <p className="text-muted-foreground mt-1">
            Season standings and weekly results
          </p>
        </div>
        <div className="flex items-center gap-4">
          {availableWeeks.length > 0 && (
            <div className="flex items-center gap-2">
              <Label htmlFor="week-selector" className="text-sm text-gray-700">
                Week:
              </Label>
              <Select
                value={selectedWeek?.toString() || ""}
                onValueChange={(value) => setSelectedWeek(Number(value))}
              >
                <SelectTrigger id="week-selector" className="w-28">
                  <SelectValue placeholder="Week" />
                </SelectTrigger>
                <SelectContent>
                  {availableWeeks.map((w) => (
                    <SelectItem key={w} value={w.toString()}>
                      Week {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-gray-700 hover:bg-gray-100 border border-gray-300"
            >
              <RefreshCw
                className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
            {justUpdated && (
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-300">
                Updated
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="season" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="season">Season Standings</TabsTrigger>
          <TabsTrigger value="weekly">Weekly Results</TabsTrigger>
          <TabsTrigger value="breakdown">Scoring Breakdown</TabsTrigger>
        </TabsList>

        {/* Season Standings */}
        <TabsContent value="season" className="space-y-6">
          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading season standings...</p>
            </div>
          )}

          {/* Overall Standings */}
          {!loading && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Season Standings
                </CardTitle>
                <CardDescription>
                  Overall leaderboard based on total wins and win percentage
                </CardDescription>
              </CardHeader>
              <CardContent>
                {seasonStandings.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="space-y-4">
                      <div className="text-6xl">🏈</div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        No Season Data Available
                      </h3>
                      <p className="text-gray-600 max-w-md mx-auto">
                        No users have submitted picks yet, or the database is
                        empty. Users need to make picks for the leaderboard to
                        populate.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {seasonStandings.map((user, index) => (
                      <div
                        key={`${String(user.user)}-${index}`}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
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
                          <img
                            src={getUserAvatar(user.avatar)}
                            alt={user.username}
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = getUserAvatar();
                            }}
                          />
                          <div>
                            <div className="font-semibold text-lg">
                              {user.username || "Unknown User"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.winPct.toFixed(1)}% win rate
                            </div>
                            {user.email && (
                              <div className="text-xs text-muted-foreground">
                                {user.email}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{user.wins}</div>
                          <div className="text-sm text-muted-foreground">
                            wins
                          </div>
                          {user.totalPoints !== undefined && (
                            <div className="text-xs text-muted-foreground">
                              {user.totalPoints} pts
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Season Stats */}
          {seasonStandings.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Season Leader
                  </CardTitle>
                  <Crown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {seasonStandings[0]?.username || "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {seasonStandings[0]?.wins ?? 0} wins
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Highest Win %
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {seasonStandings
                      .slice()
                      .sort((a, b) => b.winPct - a.winPct)[0]?.username ||
                      "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(
                      seasonStandings
                        .slice()
                        .sort((a, b) => b.winPct - a.winPct)[0]?.winPct ?? 0
                    ).toFixed(1)}
                    %
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Players
                  </CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {seasonStandings.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    active this season
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Weekly Results */}
        <TabsContent value="weekly" className="space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading weekly results...</p>
            </div>
          ) : !selectedWeek ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Select a week to view results</p>
            </div>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Week {selectedWeek} Results
                  </CardTitle>
                  <CardDescription>
                    Live scoring and standings for this week
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {weeklyStandings.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="space-y-4">
                        <div className="text-6xl">📊</div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          No Weekly Data Available
                        </h3>
                        <p className="text-gray-600 max-w-md mx-auto">
                          No scoring data available for Week {selectedWeek}.
                          Games may not have finished yet or no picks were
                          submitted.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {weeklyStandings.map((user, index) => (
                        <div
                          key={`${String(user.user)}-${index}`}
                          className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
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
                            <img
                              src={getUserAvatar(user.avatar)}
                              alt={user.username}
                              className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = getUserAvatar();
                              }}
                            />
                            <div>
                              <div className="font-semibold text-lg">
                                {user.username || "Unknown User"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {user.correctPicks}/{user.totalPicks} correct
                                picks
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {user.winPercentage.toFixed(1)}% accuracy
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">
                              {user.totalPoints}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              points
                            </div>
                            {user.fantasyPoints > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {user.fantasyPoints.toFixed(1)} fantasy pts
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Weekly Stats Summary */}
              {weeklyStandings.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Week {selectedWeek} Leader
                      </CardTitle>
                      <Crown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {weeklyStandings[0]?.username || "N/A"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {weeklyStandings[0]?.totalPoints || 0} points
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Highest Pick %
                      </CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {weeklyStandings
                          .slice()
                          .sort((a, b) => b.winPercentage - a.winPercentage)[0]
                          ?.username || "N/A"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(
                          weeklyStandings
                            .slice()
                            .sort(
                              (a, b) => b.winPercentage - a.winPercentage
                            )[0]?.winPercentage || 0
                        ).toFixed(1)}
                        %
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Players
                      </CardTitle>
                      <Trophy className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {weeklyStandings.length}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        active this week
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Scoring Breakdown */}
        <TabsContent value="breakdown" className="space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading scoring breakdown...</p>
            </div>
          ) : !selectedWeek ? (
            <div className="text-center py-8">
              <p className="text-gray-600">
                Select a week to view scoring breakdown
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Week {selectedWeek} Scoring Breakdown
                  </CardTitle>
                  <CardDescription>
                    Detailed scoring breakdown by pick type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {weeklyStandings.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="space-y-4">
                        <div className="text-6xl">🎯</div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          No Scoring Breakdown Available
                        </h3>
                        <p className="text-gray-600 max-w-md mx-auto">
                          No scoring data available for Week {selectedWeek}.
                          Users need to submit picks and games need to finish
                          for scoring to be calculated.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Scoring Legend */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-3">Scoring System</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded"></div>
                            <span>Spread Pick: 1 pt</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                            <span>Lock Pick: 2 pts</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded"></div>
                            <span>TD Scorer: 3 pts</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-purple-500 rounded"></div>
                            <span>Prop Bet: 5 pts</span>
                          </div>
                        </div>
                      </div>

                      {/* Player Breakdown */}
                      {weeklyStandings.map((user, index) => (
                        <Card
                          key={`breakdown-${user.user}`}
                          className="border-l-4 border-l-blue-500"
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge
                                  variant={getRankBadgeVariant(index + 1)}
                                  className="min-w-8 justify-center"
                                >
                                  #{index + 1}
                                </Badge>
                                <img
                                  src={getUserAvatar(user.avatar)}
                                  alt={user.username}
                                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = getUserAvatar();
                                  }}
                                />
                                <div>
                                  <h3 className="font-semibold text-lg">
                                    {user.username || "Unknown User"}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {user.correctPicks}/{user.totalPicks}{" "}
                                    correct picks
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-blue-600">
                                  {user.totalPoints}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  total points
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              {/* Spread Picks */}
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                                  <span className="font-medium text-sm">
                                    Spread Picks
                                  </span>
                                </div>
                                <div className="text-2xl font-bold text-blue-600">
                                  {user.correctPicks}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {user.correctPicks} × 1 pt ={" "}
                                  {user.correctPicks} pts
                                </div>
                              </div>

                              {/* Lock Pick */}
                              <div className="bg-yellow-50 p-3 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                                  <span className="font-medium text-sm">
                                    Lock Pick
                                  </span>
                                </div>
                                <div className="text-2xl font-bold text-yellow-600">
                                  {user.correctPicks > 0 ? "✓" : "✗"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {user.correctPicks > 0 ? "2 pts" : "0 pts"}
                                </div>
                              </div>

                              {/* TD Scorer */}
                              <div className="bg-green-50 p-3 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                                  <span className="font-medium text-sm">
                                    TD Scorer
                                  </span>
                                </div>
                                <div className="text-2xl font-bold text-green-600">
                                  {user.correctPicks > 0 ? "✓" : "✗"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {user.correctPicks > 0 ? "3 pts" : "0 pts"}
                                </div>
                              </div>

                              {/* Prop Bet */}
                              <div className="bg-purple-50 p-3 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-3 h-3 bg-purple-500 rounded"></div>
                                  <span className="font-medium text-sm">
                                    Prop Bet
                                  </span>
                                </div>
                                <div className="text-2xl font-bold text-purple-600">
                                  {user.correctPicks > 0 ? "✓" : "✗"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {user.correctPicks > 0 ? "5 pts" : "0 pts"}
                                </div>
                              </div>
                            </div>

                            {/* Fantasy Points */}
                            {user.fantasyPoints > 0 && (
                              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-sm">
                                    Fantasy Points
                                  </span>
                                  <span className="text-lg font-bold text-gray-700">
                                    {user.fantasyPoints.toFixed(1)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Leaderboard;
