import { useState, useEffect } from "react";
import { useAuth } from "../contexts/useAuth";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Clock,
  Lock,
  Target,
  TrendingUp,
  Check,
  ChevronsUpDown,
  AlertTriangle,
  Save,
} from "lucide-react";
import { currentWeekGames, mockUserPicks } from "../data/mockData";
import { apiClient } from "@/lib/api";
import type { IPlayer } from "@/types/player.type";

const Picks = () => {
  const { currentUser } = useAuth();
  const [picks, setPicks] = useState<Record<number, string>>({});
  const [lockOfWeek, setLockOfWeek] = useState("");
  const [touchdownScorer, setTouchdownScorer] = useState("");
  const [propBet, setPropBet] = useState("");
  const [propBetOdds, setPropBetOdds] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [playerSearchOpen, setPlayerSearchOpen] = useState(false);
  const [playerSearchValue, setPlayerSearchValue] = useState("");
  const [players, setPlayers] = useState<IPlayer[]>([]);
  // Track loading and error if needed for UI; currently not displayed
  const [, setPlayersLoading] = useState(false);
  const [, setPlayersError] = useState<string | null>(null);

  const currentWeek = 10;

  // Load existing picks if user has already submitted
  useEffect(() => {
    const existingPicks = mockUserPicks.find(
      (pick) => pick.userId === currentUser?.id
    );
    if (existingPicks) {
      setHasSubmitted(existingPicks.isFinalized);

      // Load spread picks
      const spreadPicks: Record<number, string> = {};
      existingPicks.picks.forEach((pick) => {
        spreadPicks[pick.gameId] = pick.selectedTeam;
      });
      setPicks(spreadPicks);

      // Load other picks
      if (existingPicks.lockOfWeek) {
        setLockOfWeek(
          `${existingPicks.lockOfWeek.gameId}-${existingPicks.lockOfWeek.selectedTeam}`
        );
      }
      if (existingPicks.touchdownScorer) {
        setTouchdownScorer(existingPicks.touchdownScorer.playerId.toString());
        setPlayerSearchValue(existingPicks.touchdownScorer.playerName);
      }
      if (existingPicks.propBet) {
        setPropBet(existingPicks.propBet.description);
        // Note: odds field doesn't exist in current mock data, so we'll set empty string
        setPropBetOdds("");
      }
    }
  }, [currentUser]);

  const handlePickChange = (gameId: number, team: string) => {
    setPicks((prev) => ({
      ...prev,
      [gameId]: team,
    }));
  };

  const handleTouchdownScorerSelect = (
    playerId: string,
    playerName: string
  ) => {
    setTouchdownScorer(playerId);
    setPlayerSearchValue(playerName);
    setPlayerSearchOpen(false);
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

  const isGameStarted = (gameTime: string) => {
    return new Date(gameTime) <= new Date();
  };

  const canSubmit = () => {
    const requiredPicks = currentWeekGames.length;
    const submittedPicks = Object.keys(picks).length;
    return (
      submittedPicks === requiredPicks &&
      lockOfWeek &&
      touchdownScorer &&
      propBet.trim() &&
      propBetOdds.trim()
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setHasSubmitted(true);
    setIsSubmitting(false);
  };

  // Fetch players from API with debounce; backend paginates to 20 per page and supports search
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const q = playerSearchValue.trim();
    setPlayersLoading(true);
    setPlayersError(null);
    const t = setTimeout(() => {
      apiClient
        .get<{ success: boolean; data?: { items: IPlayer[] } }>("players", {
          query: q ? { search: q } : undefined,
        })
        .then((res) => {
          if (!active) return;
          const list = Array.isArray(res.data?.items) ? res.data.items! : [];
          setPlayers(list);
        })
        .catch((err: unknown) => {
          if (!active) return;
          const msg =
            err instanceof Error ? err.message : "Failed to load players";
          setPlayersError(msg);
          setPlayers([]);
        })
        .finally(() => {
          if (!active) return;
          setPlayersLoading(false);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
      controller.abort();
    };
  }, [playerSearchValue]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Make Your Picks
          </h1>
          <p className="text-muted-foreground mt-1">
            Week {currentWeek} • {currentWeekGames.length} games
          </p>
        </div>
        {hasSubmitted && (
          <Badge variant="default" className="text-sm">
            Picks Submitted
          </Badge>
        )}
      </div>

      {/* Spread Picks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Spread Picks
          </CardTitle>
          <CardDescription>
            Pick the winner against the spread for each game
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {currentWeekGames.map((game) => {
              const gameStarted = isGameStarted(game.gameTime);

              return (
                <div
                  key={game.id}
                  className={`p-4 border rounded-lg transition-all duration-200 hover:shadow-md ${
                    gameStarted ? "bg-muted/50" : "hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-muted-foreground">
                      {formatGameTime(game.gameTime)}
                      {gameStarted && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Started
                        </Badge>
                      )}
                    </div>
                    {gameStarted && (
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="flex items-center gap-3 text-lg font-medium">
                      <div
                        className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                          picks[game.id] === game.awayTeam?.abbreviation
                            ? "bg-muted"
                            : ""
                        }`}
                      >
                        <img
                          src={game.awayTeam?.logoUrl}
                          alt={`${game.awayTeam?.abbreviation} logo`}
                          className="w-6 h-6 rounded-full"
                        />
                        <span>{game.awayTeam?.abbreviation}</span>
                      </div>
                      <span className="text-muted-foreground">@</span>
                      <div
                        className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                          picks[game.id] === game.homeTeam?.abbreviation
                            ? "bg-muted"
                            : ""
                        }`}
                      >
                        <img
                          src={game.homeTeam?.logoUrl}
                          alt={`${game.homeTeam?.abbreviation} logo`}
                          className="w-6 h-6 rounded-full"
                        />
                        <span>{game.homeTeam?.abbreviation}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      variant={
                        picks[game.id] === game.awayTeam?.abbreviation
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      className="flex-1 h-auto p-2 transition-all duration-200"
                      onClick={() =>
                        handlePickChange(
                          game.id,
                          game.awayTeam?.abbreviation as string
                        )
                      }
                      disabled={gameStarted}
                      style={{
                        backgroundColor:
                          picks[game.id] === game.awayTeam?.abbreviation
                            ? "#22c55e"
                            : undefined,
                        borderColor: game.awayTeam?.primaryColor,
                        color:
                          picks[game.id] === game.awayTeam?.abbreviation
                            ? "#ffffff"
                            : game.awayTeam?.primaryColor,
                      }}
                      onMouseEnter={(e) => {
                        if (
                          !gameStarted &&
                          picks[game.id] !== game.awayTeam?.abbreviation
                        ) {
                          e.currentTarget.style.backgroundColor =
                            game.awayTeam?.primaryColor + "20";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (
                          !gameStarted &&
                          picks[game.id] !== game.awayTeam?.abbreviation
                        ) {
                          e.currentTarget.style.backgroundColor = "";
                        }
                      }}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <img
                          src={game.awayTeam?.logoUrl}
                          alt={`${game.awayTeam?.abbreviation} logo`}
                          className="w-6 h-6 rounded-full"
                        />
                        <div className="text-center">
                          <div className="font-semibold text-sm">
                            {game.awayTeam?.abbreviation}
                          </div>
                          <div className="text-xs opacity-80">
                            {game.spread > 0
                              ? `+${game.spread}`
                              : game.spread < 0
                              ? `${game.spread}`
                              : "PK"}
                          </div>
                        </div>
                      </div>
                    </Button>
                    <Button
                      variant={
                        picks[game.id] === game.homeTeam?.abbreviation
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      className="flex-1 h-auto p-2 transition-all duration-200"
                      onClick={() =>
                        handlePickChange(
                          game.id,
                          game.homeTeam?.abbreviation as string
                        )
                      }
                      disabled={gameStarted}
                      style={{
                        backgroundColor:
                          picks[game.id] === game.homeTeam?.abbreviation
                            ? "#22c55e"
                            : undefined,
                        borderColor: game.homeTeam?.primaryColor,
                        color:
                          picks[game.id] === game.homeTeam?.abbreviation
                            ? "#ffffff"
                            : game.homeTeam?.primaryColor,
                      }}
                      onMouseEnter={(e) => {
                        if (
                          !gameStarted &&
                          picks[game.id] !== game.homeTeam?.abbreviation
                        ) {
                          e.currentTarget.style.backgroundColor =
                            game.homeTeam?.primaryColor + "20";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (
                          !gameStarted &&
                          picks[game.id] !== game.homeTeam?.abbreviation
                        ) {
                          e.currentTarget.style.backgroundColor = "";
                        }
                      }}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <img
                          src={game.homeTeam?.logoUrl}
                          alt={`${game.homeTeam?.abbreviation} logo`}
                          className="w-6 h-6 rounded-full"
                        />
                        <div className="text-center">
                          <div className="font-semibold text-sm">
                            {game.homeTeam?.abbreviation}
                          </div>
                          <div className="text-xs opacity-80">
                            {game.spread < 0
                              ? `+${Math.abs(game.spread)}`
                              : game.spread > 0
                              ? `${game.spread}`
                              : "PK"}
                          </div>
                        </div>
                      </div>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Lock of the Week and Touchdown Scorer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lock of the Week */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Lock of the Week
            </CardTitle>
            <CardDescription>
              Choose your most confident pick for double points
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={lockOfWeek} onValueChange={setLockOfWeek}>
              <SelectTrigger>
                <SelectValue placeholder="Select your lock of the week" />
              </SelectTrigger>
              <SelectContent>
                {currentWeekGames.map((game) => {
                  const userPick = picks[game.id];
                  if (!userPick) return null;

                  const selectedTeam =
                    game.awayTeam?.abbreviation === userPick
                      ? game.awayTeam
                      : game.homeTeam;

                  return (
                    <SelectItem key={game.id} value={`${game.id}-${userPick}`}>
                      <div className="flex items-center gap-2">
                        <img
                          src={selectedTeam?.logoUrl}
                          alt={`${selectedTeam?.abbreviation} logo`}
                          className="w-4 h-4 rounded-full"
                        />
                        <span>{game.homeTeam?.abbreviation}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Touchdown Scorer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Touchdown Scorer
            </CardTitle>
            <CardDescription>
              Pick a player to score a touchdown this week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Popover open={playerSearchOpen} onOpenChange={setPlayerSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={playerSearchOpen}
                  className="w-full justify-between"
                >
                  {playerSearchValue || "Search for a player..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput
                    placeholder="Search players..."
                    value={playerSearchValue}
                    onValueChange={setPlayerSearchValue}
                  />
                  <CommandList>
                    <CommandEmpty>No players found.</CommandEmpty>
                    <CommandGroup>
                      {players.slice(0, 20).map((player) => {
                        return (
                          <CommandItem
                            key={player.playerID}
                            value={player.longName}
                            className="flex justify-between items-center"
                            onSelect={() =>
                              handleTouchdownScorerSelect(
                                player.playerID,
                                player.longName as string
                              )
                            }
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                touchdownScorer === String(player.playerID)
                                  ? "opacity-100"
                                  : "opacity-0"
                              }`}
                            />
                            <div className="flex items-center justify-start w-full">
                              <div className="flex justify-start items-center w-full gap-2">
                                {player.espnHeadshot && (
                                  <img
                                    src={player.espnHeadshot}
                                    alt={`${player.longName} headshot`}
                                    className="w-5 h-5 rounded-full object-cover"
                                  />
                                )}

                                <span className="text-sm w-full">
                                  {player.longName}
                                </span>

                                <div className="flex gap-2 font-medium w-[20%] justify-end">
                                  <span className="text-sm">{player.team}</span>
                                  <span className="text-sm">{player.pos}</span>
                                </div>
                              </div>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>
      </div>

      {/* Prop Bet */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Prop Bet
          </CardTitle>
          <CardDescription>
            Submit a prop bet for admin approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="propBet">Prop Bet Description</Label>
            <Input
              id="propBet"
              placeholder="e.g., Over 250.5 passing yards - Patrick Mahomes"
              value={propBet}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPropBet(e.target.value)
              }
            />
            <Label htmlFor="propBetOdds">Prop Bet Odds</Label>
            <Input
              id="propBetOdds"
              placeholder="e.g., +190"
              value={propBetOdds}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPropBetOdds(e.target.value)
              }
            />
            <p className="text-xs text-muted-foreground">
              Describe your prop bet clearly and provide the odds (e.g., +190,
              -150).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit() || isSubmitting}
          size="lg"
          className="min-w-32"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Submitting...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {hasSubmitted ? "Update Picks" : "Submit Picks"}
            </>
          )}
        </Button>
      </div>

      {/* Progress Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>
                {Object.keys(picks).length}/{currentWeekGames.length} games
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    (Object.keys(picks).length / currentWeekGames.length) * 100
                  }%`,
                }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Spread picks: {Object.keys(picks).length > 0 ? "✓" : "○"}
              </span>
              <span>Lock of week: {lockOfWeek ? "✓" : "○"}</span>
              <span>TD scorer: {touchdownScorer ? "✓" : "○"}</span>
              <span>
                Prop bet: {propBet.trim() && propBetOdds.trim() ? "✓" : "○"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Picks;
