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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      })
      .catch(() => {
        if (!active) return;
        setPicks([]);
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
                const username =
                  typeof p.user === "string"
                    ? p.user
                    : p.user?.username || "User";
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
    </div>
  );
};

export default Results;
