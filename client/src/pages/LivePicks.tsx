import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Clock,
  Lock,
  Eye,
  RefreshCw,
  Play,
  AlertTriangle,
} from "lucide-react";
import { currentWeekGames, mockUserPicks, users, scoringSystem } from "../data/mockData";

const LivePicks = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  const currentWeek = 10;

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setError(null);
    
    // Simulate potential error during refresh
    setTimeout(() => {
      try {
        // In real app, this would be an API call
        setLastUpdated(new Date());
        setIsRefreshing(false);
      } catch {
        setError('Failed to refresh data. Please try again.');
        setIsRefreshing(false);
      }
    }, 1000);
  };

  const formatGameTime = (gameTime: string) => {
    return new Date(gameTime).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getGameStatus = (game: { gameTime: string }) => {
    const now = new Date();
    const gameTime = new Date(game.gameTime);
    const timeDiff = gameTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (timeDiff < 0) {
      return { status: "live", icon: Play, color: "bg-red-500", text: "LIVE" };
    } else if (hoursDiff < 1) {
      return { status: "starting", icon: Clock, color: "bg-orange-500", text: "STARTING SOON" };
    } else if (hoursDiff < 24) {
      return { status: "today", icon: Clock, color: "bg-blue-500", text: "TODAY" };
    } else {
      return { status: "upcoming", icon: Clock, color: "bg-gray-500", text: "UPCOMING" };
    }
  };

  const getSpreadDisplay = (game: { spread: number; homeTeam?: { abbreviation: string }; awayTeam?: { abbreviation: string } }) => {
    const spread = Math.abs(game.spread);
    const favoredTeam = game.spread < 0 ? game.homeTeam : game.awayTeam;
    const underdogTeam = game.spread < 0 ? game.awayTeam : game.homeTeam;

    return {
      favoredTeam: favoredTeam?.abbreviation || 'N/A',
      underdogTeam: underdogTeam?.abbreviation || 'N/A',
      spread: spread,
    };
  };

  const getUserPickForGame = (userId: number, gameId: number) => {
    const userPick = mockUserPicks.find(pick => pick.userId === userId);
    if (!userPick) return null;
    
    const gamePick = userPick.picks.find(pick => pick.gameId === gameId);
    return gamePick?.selectedTeam || null;
  };

  const getLockOfWeekForUser = (userId: number) => {
    const userPick = mockUserPicks.find(pick => pick.userId === userId);
    return userPick?.lockOfWeek || null;
  };



  const calculateUserScore = (userId: number) => {
    const userPick = mockUserPicks.find(pick => pick.userId === userId);
    if (!userPick) return 0;

    let score = 0;
    // This would be calculated based on actual game results
    // For now, showing placeholder
    score += userPick.picks.length; // 1 point per pick
    if (userPick.lockOfWeek) score += scoringSystem.correctLockOfWeek;
    if (userPick.touchdownScorer) score += scoringSystem.correctTouchdownScorer;
    if (userPick.propBet) score += scoringSystem.correctPropBet;

    return score;
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Live Picks Tracking</h1>
          <p className="text-muted-foreground mt-1">
            Week {currentWeek} • Real-time picks from all players
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Live Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Live Status Overview
          </CardTitle>
          <CardDescription>
            Current week status and player participation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">{currentWeekGames.length}</div>
              <div className="text-sm text-muted-foreground">Total Games</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{users.length}</div>
              <div className="text-sm text-muted-foreground">Players</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {mockUserPicks.filter(pick => pick.isFinalized).length}
              </div>
              <div className="text-sm text-muted-foreground">Picks Submitted</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {currentWeekGames.filter(game => getGameStatus(game).status === "live").length}
              </div>
              <div className="text-sm text-muted-foreground">Live Games</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="games">Games</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="picks">All Picks</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Week {currentWeek} Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentWeekGames.map((game) => {
                  const gameStatus = getGameStatus(game);
                  const spreadInfo = getSpreadDisplay(game);

                  return (
                    <div key={game.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${gameStatus.color}`}></div>
                        <div>
                          <div className="font-medium">
                            {game.awayTeam?.abbreviation} @ {game.homeTeam?.abbreviation}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatGameTime(game.gameTime)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm">
                          <span className="font-medium">{spreadInfo.favoredTeam}</span>
                          <span className="text-muted-foreground"> -{spreadInfo.spread}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {gameStatus.text}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Games Tab */}
        <TabsContent value="games" className="space-y-4">
          {currentWeekGames.map((game) => {
            const gameStatus = getGameStatus(game);
            const spreadInfo = getSpreadDisplay(game);

            return (
              <Card key={game.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle>
                        {game.awayTeam?.abbreviation} @ {game.homeTeam?.abbreviation}
                      </CardTitle>
                    </div>
                    <Badge variant="secondary">
                      {gameStatus.text}
                    </Badge>
                  </div>
                  <CardDescription>
                    {formatGameTime(game.gameTime)} • {spreadInfo.favoredTeam} -{spreadInfo.spread}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Player picks for this game:
                    </div>
                                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {users.map((user) => {
                        const userPick = getUserPickForGame(user.id, game.id);
                        const isLock = getLockOfWeekForUser(user.id)?.gameId === game.id;
                        
                        return (
                          <div key={user.id} className="flex items-center gap-2 p-2 border rounded text-sm">
                            <span className="font-medium">{user.name}</span>
                            {userPick ? (
                              <Badge variant={isLock ? "default" : "secondary"} className="text-xs">
                                {userPick} {isLock && <Lock className="h-3 w-3 ml-1" />}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                No Pick
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Players Tab */}
        <TabsContent value="players" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Player Picks Summary</CardTitle>
              <CardDescription>
                Complete picks breakdown for each player
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => {
                  const userPick = mockUserPicks.find(pick => pick.userId === user.id);
                  const score = calculateUserScore(user.id);
                  
                  return (
                    <div key={user.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Season: {user.seasonRecord.wins}-{user.seasonRecord.losses} ({user.seasonRecord.percentage})
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">{score}</div>
                          <div className="text-sm text-muted-foreground">Points</div>
                        </div>
                      </div>
                      
                      {userPick && (
                                                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm font-medium mb-2">Spread Picks:</div>
                            <div className="flex flex-wrap gap-1">
                              {userPick.picks.map((pick) => (
                                <Badge key={pick.gameId} variant="outline" className="text-xs">
                                  {pick.selectedTeam}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-sm">
                              <span className="font-medium">Lock:</span> {userPick.lockOfWeek?.selectedTeam}
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">TD Scorer:</span> {userPick.touchdownScorer?.playerName}
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">Prop Bet:</span> {userPick.propBet?.description}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Picks Tab */}
        <TabsContent value="picks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Complete Picks Matrix</CardTitle>
              <CardDescription>
                All player picks in a comprehensive view
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-1 sm:p-2">Player</th>
                      {currentWeekGames.map((game) => (
                        <th key={game.id} className="text-center p-1 sm:p-2">
                          <div className="text-xs">
                            {game.awayTeam?.abbreviation} @ {game.homeTeam?.abbreviation}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {game.awayTeam?.abbreviation} +{Math.abs(game.spread)}
                          </div>
                        </th>
                      ))}
                      <th className="text-center p-1 sm:p-2">Lock</th>
                      <th className="text-center p-1 sm:p-2">TD Scorer</th>
                      <th className="text-center p-1 sm:p-2">Prop Bet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const userPick = mockUserPicks.find(pick => pick.userId === user.id);
                      
                      return (
                        <tr key={user.id} className="border-b">
                          <td className="p-1 sm:p-2 font-medium">{user.name}</td>
                          {currentWeekGames.map((game) => {
                            const pick = userPick?.picks.find(p => p.gameId === game.id);
                            const isLock = userPick?.lockOfWeek?.gameId === game.id;
                            
                            return (
                              <td key={game.id} className="text-center p-1 sm:p-2">
                                {pick ? (
                                  <Badge variant={isLock ? "default" : "secondary"} className="text-xs">
                                    {pick.selectedTeam}
                                    {isLock && <Lock className="h-3 w-3 ml-1" />}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="text-center p-1 sm:p-2">
                            {userPick?.lockOfWeek ? (
                              <Badge variant="default" className="text-xs">
                                {userPick.lockOfWeek.selectedTeam}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="text-center p-1 sm:p-2">
                            {userPick?.touchdownScorer ? (
                              <div className="text-xs">
                                {userPick.touchdownScorer.playerName}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="text-center p-1 sm:p-2">
                            {userPick?.propBet ? (
                              <div className="text-xs max-w-20 sm:max-w-32 truncate" title={userPick.propBet.description}>
                                {userPick.propBet.description}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LivePicks;
