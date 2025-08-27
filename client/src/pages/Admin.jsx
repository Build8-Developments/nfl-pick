import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Settings,
  CheckCircle,
  XCircle,
  Edit,
  Save,
  AlertTriangle,
  Clock,
  Trophy,
  Target,
  Users,
} from "lucide-react";
import {
  currentWeekGames,
  pendingPropBets,
  mockUserPicks,
  users,
  weeklyResults,
} from "../data/mockData";

const Admin = () => {
  const { currentUser } = useAuth();
  const [gameResults, setGameResults] = useState({});
  const [propBetActions, setPropBetActions] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState("10");

  // Check if user is admin
  if (!currentUser?.isAdmin) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">
          You don't have permission to access the admin panel.
        </p>
      </div>
    );
  }

  const handleGameResultUpdate = (gameId, winner) => {
    setGameResults((prev) => ({
      ...prev,
      [gameId]: winner,
    }));
  };

  const handlePropBetAction = (propBetId, action) => {
    setPropBetActions((prev) => ({
      ...prev,
      [propBetId]: action,
    }));
  };

  const saveGameResults = async () => {
    setIsUpdating(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsUpdating(false);
    // Show success message
  };

  const savePropBetActions = async () => {
    setIsUpdating(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsUpdating(false);
    // Show success message
  };

  const formatGameTime = (gameTime) => {
    return new Date(gameTime).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getGameStatus = (gameTime) => {
    const now = new Date();
    const gameDate = new Date(gameTime);

    if (gameDate > now) return "scheduled";
    if (
      gameDate <= now &&
      gameDate > new Date(now.getTime() - 3 * 60 * 60 * 1000)
    )
      return "in_progress";
    return "completed";
  };

  const currentWeekStats = {
    totalGames: currentWeekGames.length,
    completedGames: currentWeekGames.filter(
      (g) => getGameStatus(g.gameTime) === "completed"
    ).length,
    submittedPicks: mockUserPicks.filter((p) => p.isFinalized).length,
    pendingProps: pendingPropBets.filter((p) => p.status === "pending").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
        <p className="text-muted-foreground mt-1">
          Manage games, approve prop bets, and override results
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Week {selectedWeek} Games
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentWeekStats.completedGames}/{currentWeekStats.totalGames}
            </div>
            <p className="text-xs text-muted-foreground">completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Submitted Picks
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentWeekStats.submittedPicks}/{users.length}
            </div>
            <p className="text-xs text-muted-foreground">players</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Props</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentWeekStats.pendingProps}
            </div>
            <p className="text-xs text-muted-foreground">need approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">total players</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="games" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="games">Game Results</TabsTrigger>
          <TabsTrigger value="props">Prop Bets</TabsTrigger>
          <TabsTrigger value="overrides">Manual Overrides</TabsTrigger>
        </TabsList>

        {/* Game Results Management */}
        <TabsContent value="games" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Week {selectedWeek} Game Results
              </CardTitle>
              <CardDescription>
                Set winners for each game to calculate player scores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentWeekGames.map((game) => {
                  const status = getGameStatus(game.gameTime);
                  const result = gameResults[game.id];

                  return (
                    <div key={game.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-medium text-lg">
                            {game.awayTeam.abbreviation} @{" "}
                            {game.homeTeam.abbreviation}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatGameTime(game.gameTime)} • Spread:{" "}
                            {game.homeTeam.abbreviation}{" "}
                            {game.spread > 0 ? "+" : ""}
                            {game.spread}
                          </div>
                        </div>
                        <Badge
                          variant={
                            status === "completed"
                              ? "default"
                              : status === "in_progress"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {status === "completed"
                            ? "Final"
                            : status === "in_progress"
                            ? "Live"
                            : "Scheduled"}
                        </Badge>
                      </div>

                      <div className="flex gap-2">
                        <Select
                          value={result || ""}
                          onValueChange={(value) =>
                            handleGameResultUpdate(game.id, value)
                          }
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select winner against spread" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={game.awayTeam.abbreviation}>
                              {game.awayTeam.abbreviation} covers
                            </SelectItem>
                            <SelectItem value={game.homeTeam.abbreviation}>
                              {game.homeTeam.abbreviation} covers
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        {result && (
                          <Badge variant="default" className="self-center">
                            {result} covers
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={saveGameResults}
                  disabled={isUpdating || Object.keys(gameResults).length === 0}
                  className="min-w-32"
                >
                  {isUpdating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Results
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prop Bet Management */}
        <TabsContent value="props" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Prop Bet Approvals
              </CardTitle>
              <CardDescription>
                Review and approve or reject player prop bets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingPropBets.map((propBet) => {
                  const user = users.find((u) => u.id === propBet.userId);
                  const action = propBetActions[propBet.id];

                  return (
                    <div key={propBet.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="font-medium">
                            {propBet.description}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Submitted by {user?.name} •{" "}
                            {new Date(propBet.submittedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge
                          variant={
                            propBet.status === "pending"
                              ? "secondary"
                              : "default"
                          }
                        >
                          {propBet.status}
                        </Badge>
                      </div>

                      {propBet.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            variant={
                              action === "approved" ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() =>
                              handlePropBetAction(propBet.id, "approved")
                            }
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            variant={
                              action === "rejected" ? "destructive" : "outline"
                            }
                            size="sm"
                            onClick={() =>
                              handlePropBetAction(propBet.id, "rejected")
                            }
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      )}

                      {action && (
                        <div className="mt-2">
                          <Badge
                            variant={
                              action === "approved" ? "default" : "destructive"
                            }
                          >
                            {action === "approved"
                              ? "Will be approved"
                              : "Will be rejected"}
                          </Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {Object.keys(propBetActions).length > 0 && (
                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={savePropBetActions}
                    disabled={isUpdating}
                    className="min-w-32"
                  >
                    {isUpdating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Actions
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Overrides */}
        <TabsContent value="overrides" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Manual Overrides
              </CardTitle>
              <CardDescription>
                Manually adjust scores and results when needed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Manual overrides should be used sparingly and only when
                  automatic scoring fails or needs correction.
                </AlertDescription>
              </Alert>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="override-week">Week</Label>
                    <Select
                      value={selectedWeek}
                      onValueChange={setSelectedWeek}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[7, 8, 9, 10].map((week) => (
                          <SelectItem key={week} value={week.toString()}>
                            Week {week}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="override-player">Player</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select player" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="correct-picks">Correct Picks</Label>
                    <Input
                      id="correct-picks"
                      type="number"
                      min="0"
                      max="16"
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lock-correct">Lock Correct</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="td-correct">TD Scorer Correct</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prop-correct">Prop Bet Correct</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button disabled={isUpdating}>
                    <Save className="mr-2 h-4 w-4" />
                    Apply Override
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
