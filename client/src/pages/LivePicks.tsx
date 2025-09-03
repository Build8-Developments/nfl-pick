import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  RefreshCw,
  AlertTriangle,
  Check,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import type { ITeam } from "@/types/team.type";
import type { IPlayer } from "@/types/player.type";
import { memCache } from "@/lib/memCache";

const LivePicks = () => {
  const [activeTab, setActiveTab] = useState("spreads");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek] = useState(8);
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [players, setPlayers] = useState<IPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data from APIs
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check cache first
        const cachedTeams = memCache.get<ITeam[]>("teams");
        const cachedPlayers = memCache.get<IPlayer[]>("players");

        if (cachedTeams && cachedPlayers) {
          setTeams(cachedTeams);
          setPlayers(cachedPlayers);
          setLoading(false);
          return;
        }

        // Fetch from API
        const [teamsRes, playersRes] = await Promise.all([
          apiClient.get<{ success: boolean; data?: ITeam[] }>("teams"),
          apiClient.get<{ success: boolean; data?: { items: IPlayer[] } }>("players", {
            query: { limit: 100 } // Get more players for better selection
          })
        ]);

        const teamList = Array.isArray(teamsRes.data) ? teamsRes.data : [];
        const playerList = Array.isArray(playersRes.data?.items) ? playersRes.data.items : [];

        setTeams(teamList);
        setPlayers(playerList);

        // Cache the results
        memCache.set("teams", teamList);
        memCache.set("players", playerList);

      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update every 30 seconds
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setError(null);
    
    // Reload data
    const loadData = async () => {
      try {
        const [teamsRes, playersRes] = await Promise.all([
          apiClient.get<{ success: boolean; data?: ITeam[] }>("teams"),
          apiClient.get<{ success: boolean; data?: { items: IPlayer[] } }>("players", {
            query: { limit: 100 }
          })
        ]);

        const teamList = Array.isArray(teamsRes.data) ? teamsRes.data : [];
        const playerList = Array.isArray(playersRes.data?.items) ? playersRes.data.items : [];

        setTeams(teamList);
        setPlayers(playerList);

        // Update cache
        memCache.set("teams", teamList);
        memCache.set("players", playerList);

      } catch (err) {
        console.error("Error refreshing data:", err);
        setError('Failed to refresh data. Please try again.');
      } finally {
        setIsRefreshing(false);
      }
    };

    loadData();
  };



  // Helper function to get user avatar
  const getUserAvatar = (userName: string) => {
    const avatars = [
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face",
    ];
    
    // Use name to get consistent avatar
    const index = userName.charCodeAt(0) % avatars.length;
    return avatars[index];
  };

  // Helper function to get player headshot with fallback
  const getPlayerHeadshot = (player: IPlayer | undefined) => {
    if (!player) return null;
    
    // Try ESPN headshot first, then fallback to placeholder
    if (player.espnHeadshot && player.espnHeadshot.trim() !== "") {
      return player.espnHeadshot;
    }
    
    // Fallback to a generic player placeholder
    return `https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop&crop=face`;
  };

  // Mock picks data using real team and player data
  const mockPicksWithOutcomes = useMemo(() => {
    if (teams.length === 0 || players.length === 0) return [];

    // Get some real teams and players for the mock data
    const availableTeams = teams.slice(0, 16); // Get first 16 teams
    const availablePlayers = players.filter(p => p.pos && ['QB', 'RB', 'WR', 'TE'].includes(p.pos)).slice(0, 20);

    return [
      {
        userId: 1,
        userName: "Luke",
        userAvatar: getUserAvatar("Luke"),
        picks: [
          { team: availableTeams[0]?.teamAbv || "GB", isCorrect: true },
          { team: availableTeams[1]?.teamAbv || "CAR", isCorrect: true },
          { team: availableTeams[2]?.teamAbv || "NYJ", isCorrect: true },
          { team: availableTeams[3]?.teamAbv || "TB", isCorrect: true },
          { team: availableTeams[4]?.teamAbv || "MIN", isCorrect: false },
          { team: availableTeams[5]?.teamAbv || "NYG", isCorrect: false },
          { team: availableTeams[6]?.teamAbv || "PIT", isCorrect: false },
          { team: availableTeams[7]?.teamAbv || "TEN", isCorrect: false },
          { team: availableTeams[8]?.teamAbv || "ARI", isCorrect: false },
        ],
        lock: { team: availableTeams[3]?.teamAbv || "TB", isCorrect: true },
        tdScorer: { 
          player: availablePlayers[0]?.longName || "BARKLEY", 
          playerId: availablePlayers[0]?.playerID || "1",
          playerHeadshot: getPlayerHeadshot(availablePlayers[0]),
          isCorrect: false 
        },
        propBet: { description: `${availableTeams[5]?.teamAbv || "NYG"} 10+ 1H Points (+150)`, isCorrect: true },
        totalPoints: 6,
      },
      {
        userId: 2,
        userName: "Mike",
        userAvatar: getUserAvatar("Mike"),
        picks: [
          { team: availableTeams[9]?.teamAbv || "DET", isCorrect: false },
          { team: availableTeams[1]?.teamAbv || "CAR", isCorrect: true },
          { team: availableTeams[10]?.teamAbv || "MIA", isCorrect: false },
          { team: availableTeams[3]?.teamAbv || "TB", isCorrect: true },
          { team: availableTeams[11]?.teamAbv || "ATL", isCorrect: false },
          { team: availableTeams[5]?.teamAbv || "NYG", isCorrect: false },
          { team: availableTeams[6]?.teamAbv || "PIT", isCorrect: false },
          { team: availableTeams[7]?.teamAbv || "TEN", isCorrect: false },
          { team: availableTeams[8]?.teamAbv || "ARI", isCorrect: false },
        ],
        lock: { team: availableTeams[8]?.teamAbv || "ARI", isCorrect: false },
        tdScorer: { 
          player: availablePlayers[1]?.longName || "HENRY", 
          playerId: availablePlayers[1]?.playerID || "2",
          playerHeadshot: getPlayerHeadshot(availablePlayers[1]),
          isCorrect: true 
        },
        propBet: { description: `${availablePlayers[2]?.longName || "Kupp"} O 5.5 Rec (-126)`, isCorrect: false },
        totalPoints: 4,
      },
      {
        userId: 3,
        userName: "Gav",
        userAvatar: getUserAvatar("Gav"),
        picks: [
          { team: availableTeams[9]?.teamAbv || "DET", isCorrect: false },
          { team: availableTeams[12]?.teamAbv || "PHI", isCorrect: false },
          { team: availableTeams[2]?.teamAbv || "NYJ", isCorrect: true },
          { team: availableTeams[3]?.teamAbv || "TB", isCorrect: true },
          { team: availableTeams[4]?.teamAbv || "MIN", isCorrect: false },
          { team: availableTeams[13]?.teamAbv || "NO", isCorrect: true },
          { team: availableTeams[14]?.teamAbv || "CLE", isCorrect: true },
          { team: availableTeams[7]?.teamAbv || "TEN", isCorrect: false },
          { team: availableTeams[15]?.teamAbv || "SEA", isCorrect: true },
        ],
        lock: { team: availableTeams[13]?.teamAbv || "NO", isCorrect: true },
        tdScorer: { 
          player: availablePlayers[3]?.longName || "WALKER", 
          playerId: availablePlayers[3]?.playerID || "3",
          playerHeadshot: getPlayerHeadshot(availablePlayers[3]),
          isCorrect: true 
        },
        propBet: { description: `${availablePlayers[4]?.longName || "Chase"} 60+ Rec Yards (-185)`, isCorrect: false },
        totalPoints: 3,
      },
    ];
  }, [teams, players]);



  // Helper function to get team logo
  const getTeamLogo = (teamAbv: string) => {
    const team = teams.find(t => t.teamAbv === teamAbv);
    if (team?.espnLogo1) {
      return team.espnLogo1;
    }
    if (team?.nflComLogo1) {
      return team.nflComLogo1;
    }
    // Fallback to a generic NFL logo
    return "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop&crop=face";
  };

  const getOutcomeIcon = (isCorrect: boolean) => {
    return isCorrect ? (
      <Check className="h-6 w-6 text-green-500" />
    ) : (
      <X className="h-6 w-6 text-red-500" />
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Simplified Header (white background, black text) */}
      <div className="bg-white text-gray-900 px-4 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <h1 className="text-xl font-bold text-black">
              WEEK {selectedWeek}
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="ml-4 text-gray-700 hover:bg-gray-100 border border-gray-300"
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading picks data...</p>
          </div>
        )}

        {/* No Data State */}
        {!loading && mockPicksWithOutcomes.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">No picks data available</p>
          </div>
        )}

        {/* Spreads: 3 user avatars as column headers, rows per game with larger logos */}
        {!loading && mockPicksWithOutcomes.length > 0 && (
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">SPREADS</h2>

            {/* Header avatars aligned with columns */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {mockPicksWithOutcomes.map((user) => (
                <div key={user.userId} className="flex items-center justify-center">
                  <img
                    src={user.userAvatar}
                    alt={user.userName}
                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-300 shadow"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face";
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Game rows: each cell shows the user's pick for that match */}
            {(() => {
              const users = mockPicksWithOutcomes;
              const maxGames = Math.max(...users.map((u) => u.picks.length));
              return (
                <div className="space-y-3">
                  {Array.from({ length: maxGames }).map((_, gameIdx) => (
                    <div key={gameIdx} className="grid grid-cols-3 gap-3">
                      {users.map((user) => {
                        const pick = user.picks[gameIdx];
                        if (!pick) {
                          return (
                            <div key={user.userId} className="h-16 rounded-xl bg-gray-100 border border-gray-200" />
                          );
                        }
                        const teamLogo = getTeamLogo(pick.team);
                        // Use navy blue colors by default
                        const bgClass = 'bg-blue-900 text-white';
                        const borderClass = 'border-blue-800';
                        return (
                          <div
                            key={user.userId}
                            className={`${bgClass} p-3 rounded-xl text-center font-bold text-sm shadow-md border-2 ${borderClass} flex flex-col items-center justify-center`}
                          >
                            <img
                              src={teamLogo}
                              alt={pick.team}
                              className="w-10 h-10 rounded-full object-cover mb-1"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                            <span className="text-xs font-bold">{pick.team}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Enhanced Lock Section */}
        {!loading && mockPicksWithOutcomes.length > 0 && (
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 shadow-sm border border-yellow-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">LOCK OF THE WEEK</h2>
            <div className="grid grid-cols-3 gap-3">
              {mockPicksWithOutcomes.map((user) => {
                const teamLogo = getTeamLogo(user.lock.team);
                return (
                  <div
                    key={user.userId}
                    className="bg-blue-900 text-white p-4 rounded-xl text-center font-bold text-sm relative shadow-lg border-2 border-blue-800"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={teamLogo}
                        alt={user.lock.team}
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                      <span className="text-sm font-bold">{user.lock.team}</span>
                      <div className="text-xs opacity-75">{user.userName}</div>
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
          </div>
        )}

        {/* Enhanced TD Scorer Section */}
        {!loading && mockPicksWithOutcomes.length > 0 && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 shadow-sm border border-green-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">TOUCHDOWN SCORER</h2>
            <div className="grid grid-cols-3 gap-4">
              {mockPicksWithOutcomes.map((user) => (
                <div key={user.userId} className="text-center">
                  <div className="relative bg-white rounded-xl p-3 shadow-md border border-gray-100">
                    <div className="flex flex-col items-center gap-2">
                      {user.tdScorer.playerHeadshot ? (
                        <img
                          src={user.tdScorer.playerHeadshot}
                          alt={user.tdScorer.player}
                          className="w-16 h-16 rounded-full object-cover border-3 border-gray-200 shadow-md"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop&crop=face";
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center text-2xl shadow-md">
                          🏈
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-sm font-bold text-gray-800">{user.tdScorer.player}</p>
                        <p className="text-xs text-gray-500">{user.userName}</p>
                      </div>
                    </div>
                    <div className="absolute -top-2 -right-2">
                      {user.tdScorer.isCorrect ? (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                          <X className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

                {/* Enhanced Prop Bet Section */}
        {!loading && mockPicksWithOutcomes.length > 0 && (
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 shadow-sm border border-purple-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">PROP BETS</h2>
            <div className="space-y-3">
              {mockPicksWithOutcomes.map((user) => (
                <div key={user.userId} className="relative">
                  <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100">
                    <div className="flex items-center gap-3">
                      <img
                        src={user.userAvatar}
                        alt={user.userName}
                        className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face";
                        }}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">{user.propBet.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{user.userName}</p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2">
                    {user.propBet.isCorrect ? (
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                        <X className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
              </div>
              ))}
            </div>
          </div>
        )}

                {/* Enhanced Total Points Section */}
        {!loading && mockPicksWithOutcomes.length > 0 && (
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 shadow-sm border border-blue-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">TOTAL POINTS</h2>
            <div className="grid grid-cols-3 gap-4">
              {mockPicksWithOutcomes.map((user, index) => {
                const isLeader = index === 0; // First user is leader
                return (
                  <div key={user.userId} className="text-center">
                    <div className={`${
                      isLeader 
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg scale-105' 
                        : 'bg-blue-900 text-white shadow-md'
                    } p-4 rounded-xl text-2xl font-bold mb-3`}>
                      {user.totalPoints}
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={user.userAvatar}
                        alt={user.userName}
                        className={`w-10 h-10 rounded-full object-cover border-3 ${
                          isLeader ? 'border-yellow-400 shadow-lg' : 'border-gray-300'
                        }`}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face";
                        }}
                      />
                      <div className="text-center">
                        <p className="text-sm font-bold text-gray-800">{user.userName}</p>
                        {isLeader && (
                          <p className="text-xs text-yellow-600 font-semibold">LEADER</p>
                        )}
                      </div>
                    </div>
              </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Desktop/Tablet View - Hidden on mobile */}
      <div className="hidden lg:block">
        <div className="max-w-6xl mx-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
                  <CardDescription>All player spread picks with outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading picks...</p>
                </div>
              ) : mockPicksWithOutcomes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No picks data available</p>
                </div>
              ) : (
              <div className="space-y-4">
                    {mockPicksWithOutcomes.map((user) => (
                      <div key={user.userId} className="p-4 border rounded-lg">
                        <div className="flex items-center gap-3 mb-3">
                          <img
                            src={user.userAvatar}
                            alt={user.userName}
                            className="w-10 h-10 rounded-full object-cover border-2 border-primary"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face";
                            }}
                          />
                        <div>
                            <h3 className="font-semibold">{user.userName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {user.picks.filter(p => p.isCorrect).length}/{user.picks.length} correct
                            </p>
                          </div>
                        </div>
                                                <div className="grid grid-cols-9 gap-2">
                          {user.picks.map((pick, index) => {
                            const teamLogo = getTeamLogo(pick.team);
                            return (
                              <div
                                key={index}
                                className="bg-blue-900 text-white p-2 rounded-lg text-center text-xs font-bold relative shadow-md border border-blue-800"
                              >
                                <div className="flex flex-col items-center gap-1">
                                  <img
                                    src={teamLogo}
                                    alt={pick.team}
                                    className="w-4 h-4 rounded-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                  />
                                  <span className="text-xs font-bold">{pick.team}</span>
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
                  <CardDescription>Each player's most confident pick</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="text-gray-600 mt-2">Loading picks...</p>
                    </div>
                  ) : mockPicksWithOutcomes.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600">No picks data available</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {mockPicksWithOutcomes.map((user) => {
                        return (
                          <div key={user.userId} className="p-4 border rounded-lg text-center">
                                                      <div className="flex items-center justify-center gap-2 mb-2">
                            <img
                              src={user.userAvatar}
                              alt={user.userName}
                              className="w-8 h-8 rounded-full object-cover border-2 border-primary"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face";
                              }}
                            />
                            <span className="font-semibold">{user.userName}</span>
                          </div>
                            <div className="bg-blue-900 text-white p-4 rounded-xl text-center font-bold text-lg relative shadow-lg border-2 border-blue-800">
                              <div className="flex flex-col items-center gap-2">
                                <img
                                  src={getTeamLogo(user.lock.team)}
                                  alt={user.lock.team}
                                  className="w-8 h-8 rounded-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                                <span className="text-lg font-bold">{user.lock.team}</span>
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
                  <CardDescription>Player touchdown scorer predictions</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading picks...</p>
                          </div>
              ) : mockPicksWithOutcomes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No picks data available</p>
                            </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {mockPicksWithOutcomes.map((user) => (
                    <div key={user.userId} className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <img
                          src={user.userAvatar}
                          alt={user.userName}
                          className="w-8 h-8 rounded-full object-cover border-2 border-primary"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face";
                          }}
                        />
                        <span className="font-semibold">{user.userName}</span>
                      </div>
                      <div className="relative">
                        {user.tdScorer.playerHeadshot ? (
                          <img
                            src={user.tdScorer.playerHeadshot}
                            alt={user.tdScorer.player}
                            className="w-20 h-20 rounded-full mx-auto mb-2 object-cover border-2 border-gray-300"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop&crop=face";
                            }}
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-2 flex items-center justify-center text-3xl">
                            🏈
                          </div>
                        )}
                        {getOutcomeIcon(user.tdScorer.isCorrect)}
                        <p className="text-lg font-semibold mt-2">{user.tdScorer.player}</p>
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
                  <CardDescription>Custom proposition bets from players</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading picks...</p>
                          </div>
              ) : mockPicksWithOutcomes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No picks data available</p>
                              </div>
                            ) : (
                <div className="space-y-4">
                  {mockPicksWithOutcomes.map((user) => (
                    <div key={user.userId} className="p-4 border rounded-lg relative">
                                              <div className="flex items-center gap-3 mb-2">
                          <img
                            src={user.userAvatar}
                            alt={user.userName}
                            className="w-8 h-8 rounded-full object-cover border-2 border-primary"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face";
                            }}
                          />
                          <span className="font-semibold">{user.userName}</span>
                        </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium">{user.propBet.description}</p>
                      </div>
                      {getOutcomeIcon(user.propBet.isCorrect)}
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