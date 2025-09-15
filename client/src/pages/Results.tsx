import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import type { IGame } from "@/types/game.type";
import type { ITeam } from "@/types/team.type";
import { memCache } from "@/lib/memCache";
import { manualWeekSheets, type ManualWeekSheet } from "@/data/manualResults";
import ResultsSheet from "@/components/ResultsSheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type BackendPick = {
  _id: string;
  user: { _id: string; username: string; avatar?: string } | string;
  week: number;
  selections: Record<string, string>;
  outcomes?: Record<string, boolean | null>;
  lockOfWeek?: string;
  touchdownScorer?: string;
  propBet?: string;
  propBetOdds?: string;
  isFinalized?: boolean;
};

const Results = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);
  const [, setTeams] = useState<ITeam[]>([]);
  const [games, setGames] = useState<IGame[]>([]);
  const [picks, setPicks] = useState<BackendPick[]>([]);
  const [autoSheet, setAutoSheet] = useState<ManualWeekSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<
    Array<{ _id: string; username: string; avatar: string }>
  >([]);

  // Fetch users from backend
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiClient.get<{
          success: boolean;
          data?: Array<{ _id: string; username: string; avatar: string }>;
        }>("users");
        if (response.data && Array.isArray(response.data)) {
          setUsers(response.data);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError(null);
        const cachedTeams = memCache.get<ITeam[]>("teams");
        const cachedGames = memCache.get<IGame[]>("games");
        if (cachedTeams) setTeams(cachedTeams);
        if (cachedGames) setGames(cachedGames);
        if (!cachedTeams) {
          const res = await apiClient.get<{ success: boolean; data?: ITeam[] }>(
            "teams"
          );
          const list = Array.isArray(res.data) ? res.data : [];
          setTeams(list);
          memCache.set("teams", list);
        }
        if (!cachedGames) {
          const res = await apiClient.get<{ success: boolean; data?: IGame[] }>(
            "games"
          );
          const list = Array.isArray(res.data) ? (res.data as IGame[]) : [];
          setGames(list);
          memCache.set("games", list);
        }
        const finalWeeksRes = await apiClient.get<{
          success: boolean;
          data?: number[];
        }>("picks/weeks");
        const weeks = Array.isArray(finalWeeksRes.data)
          ? finalWeeksRes.data
          : [];
        const gameWeeks = (cachedGames || [])
          .map((g) =>
            typeof g.gameWeek === "string"
              ? g.gameWeek.match(/\d+/)?.[0]
              : undefined
          )
          .filter((n): n is string => Boolean(n))
          .map((n) => Number(n))
          .filter((n) => !Number.isNaN(n));
        const merged = [
          ...new Set([...(weeks || []), ...(gameWeeks || [])]),
        ].sort((a, b) => a - b);
        setAvailableWeeks(merged);
        const urlWeek = Number(searchParams.get("week"));
        if (Number.isFinite(urlWeek) && urlWeek > 0) {
          setSelectedWeek(urlWeek);
        } else if (merged.length && selectedWeek == null) {
          setSelectedWeek(merged[merged.length - 1]);
        }
      } catch (err) {
        console.log(err);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!selectedWeek) return;
    let active = true;
    setLoading(true);
    apiClient
      .get<{ success?: boolean; data?: BackendPick[] }>(
        `picks/all/${selectedWeek}`
      )
      .then((res) => {
        if (!active) return;
        setPicks(Array.isArray(res?.data) ? res.data! : []);
        // Build auto sheet for the selected week (e.g., week 3 and beyond)
        const auto = buildAutoSheet(selectedWeek, Array.isArray(res?.data) ? res.data! : [], games);
        setAutoSheet(auto);
      })
      .catch(() => {
        if (!active) return;
        setPicks([]);
        setAutoSheet(null);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedWeek]);

  const gameIdToLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of games) {
      map.set(String(g.gameID), `${g.away}@${g.home}`);
    }
    return map;
  }, [games]);

  function buildAutoSheet(week: number, weekPicks: BackendPick[], allGames: IGame[]): ManualWeekSheet | null {
    if (!Array.isArray(weekPicks) || weekPicks.length === 0) return null;
    const normalize = (s?: string) => (s || "").trim().toLowerCase();
    // Identify our three users
    const players = {
      gavin: weekPicks.find((p) => typeof p.user !== "string" && normalize(p.user?.username) === "gavin"),
      luke: weekPicks.find((p) => typeof p.user !== "string" && normalize(p.user?.username) === "luke"),
      mike: weekPicks.find((p) => typeof p.user !== "string" && normalize(p.user?.username) === "mike"),
    } as const;
    if (!players.gavin || !players.luke || !players.mike) return null;

    // Order games by week and a stable key
    const weekGames = allGames
      .filter((g) => {
        const m = (g.gameWeek || "").match(/\d+/)?.[0];
        return m ? Number(m) === week : false;
      })
      .sort((a, b) => String(a.gameID).localeCompare(String(b.gameID)));

    const gamesRows = weekGames.map((g, idx) => ({
      gameNumber: idx + 1,
      gavin: players.gavin?.selections?.[String(g.gameID)] || "",
      luke: players.luke?.selections?.[String(g.gameID)] || "",
      mike: players.mike?.selections?.[String(g.gameID)] || "",
    }));

    const countRecord = (p: BackendPick) => {
      let wins = 0;
      let losses = 0;
      for (const [gid, outcome] of Object.entries(p.outcomes || {})) {
        // only count games that belong to this week
        if (!weekGames.some((g) => String(g.gameID) === String(gid))) continue;
        if (outcome === true) wins += 1;
        else if (outcome === false) losses += 1;
      }
      return { wins, losses };
    };

    const rG = countRecord(players.gavin);
    const rL = countRecord(players.luke);
    const rM = countRecord(players.mike);

    const lockWin = (p: BackendPick) => {
      if (!p.lockOfWeek) return 0;
      const outcome = p.outcomes?.[String(p.lockOfWeek)] ?? null;
      return outcome === true ? 1 : 0;
    };

    const totals = {
      gavin: rG.wins + lockWin(players.gavin),
      luke: rL.wins + lockWin(players.luke),
      mike: rM.wins + lockWin(players.mike),
    };

    const sheet: ManualWeekSheet = {
      week,
      games: gamesRows,
      record: { gavin: `${rG.wins} - ${rG.losses}`, luke: `${rL.wins} - ${rL.losses}`, mike: `${rM.wins} - ${rM.losses}` },
      lockOTW: {
        gavin: players.gavin.lockOfWeek || "",
        luke: players.luke.lockOfWeek || "",
        mike: players.mike.lockOfWeek || "",
      },
      tdScorer: {
        gavin: players.gavin.touchdownScorer || "",
        luke: players.luke.touchdownScorer || "",
        mike: players.mike.touchdownScorer || "",
      },
      propOTW: {
        gavin: players.gavin.propBet || "",
        luke: players.luke.propBet || "",
        mike: players.mike.propBet || "",
      },
      totals,
    };
    return sheet;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Results</h1>
          <p className="text-muted-foreground">Finalized picks by week</p>
        </div>
        {availableWeeks.length > 0 && (
          <div className="flex items-center gap-2">
            <Label htmlFor="week" className="text-sm text-muted-foreground">
              Week
            </Label>
            <Select
              value={selectedWeek?.toString() || ""}
              onValueChange={(v) => {
                const n = Number(v);
                setSelectedWeek(n);
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  if (Number.isFinite(n)) next.set("week", String(n));
                  return next;
                });
              }}
            >
              <SelectTrigger id="week" className="w-24">
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
            <Button
              variant="outline"
              onClick={() => {
                if (!selectedWeek) return;
                setLoading(true);
                apiClient
                  .get<{ success?: boolean; data?: BackendPick[] }>(
                    `picks/all/${selectedWeek}`
                  )
                  .then((res) =>
                    setPicks(Array.isArray(res?.data) ? res.data! : [])
                  )
                  .catch(() => setPicks([]))
                  .finally(() => setLoading(false));
              }}
            >
              Refresh
            </Button>
          </div>
        )}
      </div>

      {error && (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Week {selectedWeek ?? "-"} Results</CardTitle>
          <CardDescription>All submitted picks</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading...</p>
            </div>
          ) : picks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No picks found for this week
            </div>
          ) : (
            <div className="space-y-4">
              {picks.map((p) => {
                const username = (() => {
                  if (typeof p.user === "string") {
                    // If user is just an ID string, try to find the user in our users list
                    const foundUser = users.find((u) => u._id === p.user);
                    return foundUser?.username || "User";
                  } else {
                    return p.user?.username || "User";
                  }
                })();
                return (
                  <div key={p._id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">{username}</div>
                      <div className="text-xs text-muted-foreground">
                        Lock: {p.lockOfWeek || "—"}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {Object.entries(p.selections || {}).map(([gid, team]) => (
                        <div
                          key={gid}
                          className="text-sm flex items-center justify-between border rounded-md px-3 py-2"
                        >
                          <span className="truncate mr-3">
                            {gameIdToLabel.get(String(gid)) || gid}
                          </span>
                          <span className="font-medium">{team}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      TD Scorer: {p.touchdownScorer || "—"} • Prop:{" "}
                      {p.propBet || "—"} ({p.propBetOdds || "—"})
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Week Sheets - swipeable/tabs */}
      {([...manualWeekSheets, ...(autoSheet ? [autoSheet] : [])].length > 0) && (
        <Tabs defaultValue={String(manualWeekSheets[manualWeekSheets.length - 1].week)}>
          <TabsList className="mb-2">
            {[...manualWeekSheets, ...(autoSheet ? [autoSheet] : [])].map((s) => (
              <TabsTrigger key={s.week} value={String(s.week)}>
                Week {s.week}
              </TabsTrigger>
            ))}
          </TabsList>
          {[...manualWeekSheets, ...(autoSheet ? [autoSheet] : [])].map((s) => (
            <TabsContent key={s.week} value={String(s.week)}>
              <ResultsSheet sheet={s} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};

export default Results;
