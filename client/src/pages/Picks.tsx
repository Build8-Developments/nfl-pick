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
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { currentWeekGames, nflPlayers, mockUserPicks } from "../data/mockData";

const Picks = () => {
  const { currentUser } = useAuth();
  const [picks, setPicks] = useState<Record<number, string>>({});
  const [lockOfWeek, setLockOfWeek] = useState("");
  const [touchdownScorer, setTouchdownScorer] = useState("");
  const [propBet, setPropBet] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [playerSearchOpen, setPlayerSearchOpen] = useState(false);
  const [playerSearchValue, setPlayerSearchValue] = useState("");

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
    playerId: number,
    playerName: string
  ) => {
    setTouchdownScorer(playerId.toString());
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

  const getSpreadDisplay = (game: {
    spread: number;
    homeTeam: { abbreviation: string };
    awayTeam: { abbreviation: string };
  }) => {
    const spread = Math.abs(game.spread);
    const favoredTeam = game.spread < 0 ? game.homeTeam : game.awayTeam;
    const underdogTeam = game.spread < 0 ? game.awayTeam : game.homeTeam;

    return {
      favoredTeam: favoredTeam.abbreviation,
      underdogTeam: underdogTeam.abbreviation,
      spread: spread,
      favoredTeamFull: favoredTeam,
      underdogTeamFull: underdogTeam,
    };
  };

  const canSubmit = () => {
    const requiredPicks = currentWeekGames.length;
    const submittedPicks = Object.keys(picks).length;
    return (
      submittedPicks === requiredPicks &&
      lockOfWeek &&
      touchdownScorer &&
      propBet.trim()
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

  const filteredPlayers = nflPlayers.filter(
    (player) =>
      player.name.toLowerCase().includes(playerSearchValue.toLowerCase()) ||
      player.team.toLowerCase().includes(playerSearchValue.toLowerCase())
  );

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

      {/* Status Alert */}
      {hasSubmitted && (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertDescription>
            Your picks for Week {currentWeek} have been submitted successfully.
            You can still edit them until the first game starts.
          </AlertDescription>
        </Alert>
      )}

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
          <div className="space-y-4">
            {currentWeekGames.map((game) => {
              const spreadInfo = getSpreadDisplay(
                game as {
                  spread: number;
                  homeTeam: { abbreviation: string };
                  awayTeam: { abbreviation: string };
                }
              );
              const gameStarted = isGameStarted(game.gameTime);

              return (
                <div
                  key={game.id}
                  className={`p-4 border rounded-lg ${
                    gameStarted ? "bg-muted/50 cursor-not-allowed" : ""
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

                  <div className="flex items-center justify-between">
                    <div className="text-lg font-medium">
                      {game.awayTeam?.abbreviation} @{" "}
                      {game.homeTeam?.abbreviation}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {spreadInfo.favoredTeam} -{spreadInfo.spread}
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
                      className="flex-1"
                      onClick={() =>
                        handlePickChange(
                          game.id,
                          game.awayTeam?.abbreviation as string
                        )
                      }
                      disabled={gameStarted}
                    >
                      {game.awayTeam?.abbreviation}
                      {game.spread > 0 && ` +${Math.abs(game.spread)}`}
                    </Button>
                    <Button
                      variant={
                        picks[game.id] === game.homeTeam?.abbreviation
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        handlePickChange(
                          game.id,
                          game.homeTeam?.abbreviation as string
                        )
                      }
                      disabled={gameStarted}
                    >
                      {game.homeTeam?.abbreviation}
                      {game.spread < 0 && ` +${Math.abs(game.spread)}`}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

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

                return (
                  <SelectItem key={game.id} value={`${game.id}-${userPick}`}>
                    {userPick} ({game.awayTeam?.abbreviation} @{" "}
                    {game.homeTeam?.abbreviation})
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
                    {filteredPlayers.slice(0, 10).map((player) => (
                      <CommandItem
                        key={player.id}
                        value={player.name}
                        onSelect={() =>
                          handleTouchdownScorerSelect(
                            player.id,
                            player.name as string
                          )
                        }
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            touchdownScorer === player.id.toString()
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                        />
                        <div className="flex items-center justify-between w-full">
                          <span>{player.name}</span>
                          <div className="text-xs text-muted-foreground">
                            {player.team} • {player.position}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

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
            <p className="text-xs text-muted-foreground">
              Describe your prop bet clearly. Admin will approve or reject it.
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
              <span>Prop bet: {propBet.trim() ? "✓" : "○"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Picks;
