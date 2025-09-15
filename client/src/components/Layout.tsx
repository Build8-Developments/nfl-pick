import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { Button } from "./ui/button.tsx";
import {
  Home,
  FileText,
  Trophy,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { getUserAvatar } from "../lib/avatarUtils";
import { useEffect } from "react";
import { dashboardApi, apiClient } from "../lib/api";

const Layout = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [seasonRecord, setSeasonRecord] = useState<{ wins: number; losses: number; winPct: number }>({ wins: 0, losses: 0, winPct: 0 });

  useEffect(() => {
    let isActive = true;
    const computeFromPicks = async () => {
      if (!currentUser?.id) {
        if (isActive) setSeasonRecord({ wins: 0, losses: 0, winPct: 0 });
        return;
      }
      try {
        // Load games (for status) and weeks with picks
        const [gamesRes, weeksRes] = await Promise.all([
          apiClient.get<{ success: boolean; data?: any[] }>("games"),
          apiClient.get<{ success: boolean; data?: number[] }>("picks/weeks"),
        ]);

        const games = Array.isArray(gamesRes.data) ? (gamesRes.data as any[]) : [];
        const weeks = Array.isArray(weeksRes.data) ? (weeksRes.data as number[]) : [];

        const getGameStatus = (game: {
          gameTime: string;
          gameStatus?: string;
          gameStatusCode?: string;
          gameDate?: string;
          gameTimeEpoch?: string;
        }) => {
          if (game.gameStatus) {
            const status = game.gameStatus.toLowerCase();
            if (status.includes("final") || status.includes("completed") || status.includes("finished")) return "completed" as const;
            if (status.includes("in_progress") || status.includes("live") || status.includes("active")) return "in_progress" as const;
            if (status.includes("scheduled") || status.includes("upcoming") || status.includes("pre")) return "scheduled" as const;
          }
          if (game.gameStatusCode) {
            const code = game.gameStatusCode.toLowerCase();
            if (code.includes("final")) return "completed" as const;
          }
          const now = new Date();
          const epochMs = (() => {
            const e = game.gameTimeEpoch ? Number(game.gameTimeEpoch) : NaN;
            return Number.isFinite(e) && e > 0 ? e * 1000 : NaN;
          })();
          const dt = Number.isFinite(epochMs) ? new Date(epochMs) : new Date(game.gameTime);
          if (dt > now) return "scheduled" as const;
          const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
          if (dt > sixHoursAgo) return "in_progress" as const;
          return "completed" as const;
        };

        const parseWeekNum = (w?: string) => {
          const m = (w || "").match(/\d+/)?.[0];
          return m ? Number(m) : NaN;
        };

        const weekToFinishedIds = new Map<number, Set<string>>();
        const uniqueWeeks = [...new Set(games.map((g) => parseWeekNum(g.gameWeek)).filter((n) => Number.isFinite(n)) as number[])];
        for (const wk of uniqueWeeks) {
          const finished = new Set<string>();
          games
            .filter((g) => parseWeekNum(g.gameWeek) === wk)
            .forEach((g) => {
              if (getGameStatus(g as any) === "completed") finished.add(String(g.gameID));
            });
          weekToFinishedIds.set(wk, finished);
        }

        let wins = 0;
        let losses = 0;
        for (const wk of weeks) {
          const finishedIds = weekToFinishedIds.get(wk) || new Set<string>();
          if (finishedIds.size === 0) continue;
          const pickRes = await apiClient.get<{
            success: boolean;
            data?: { outcomes?: Record<string, boolean | null> } | null;
          }>(`picks/${wk}`);
          if (pickRes.success && pickRes.data?.outcomes) {
            for (const [gid, outcome] of Object.entries(pickRes.data.outcomes)) {
              if (!finishedIds.has(String(gid))) continue;
              if (outcome === true) wins += 1;
              else if (outcome === false) losses += 1;
            }
          }
        }

        const total = wins + losses;
        const pct = total > 0 ? (wins / total) * 100 : 0;
        if (isActive) setSeasonRecord({ wins, losses, winPct: pct });
      } catch {
        if (isActive) setSeasonRecord({ wins: 0, losses: 0, winPct: 0 });
      }
    };
    computeFromPicks();
    return () => {
      isActive = false;
    };
  }, [currentUser?.id]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Make Picks", href: "/picks", icon: FileText },
    { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
    { name: "Results", href: "/results", icon: FileText },
    { name: "Live Picks", href: "/live-picks", icon: Home },
    ...(currentUser?.isAdmin
      ? [{ name: "Admin", href: "/admin", icon: Settings }]
      : []),
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(href);
  };


  const avatarUrl = getUserAvatar(currentUser?.avatar);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center gap-3">
              <img
                src={avatarUrl}
                alt="User avatar"
                className="h-10 w-10 rounded-full object-cover border"
              />
              <div>
                <h1 className="text-xl font-bold text-foreground">NFL Picks</h1>
                {currentUser && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Welcome, {currentUser.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User info and logout */}
          <div className="p-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={avatarUrl}
                  alt="User avatar"
                  className="h-8 w-8 rounded-full object-cover border"
                />
                <div className="text-sm">
                  <p className="font-medium text-foreground">
                    {currentUser?.name}
                  </p>
                  <p className="text-muted-foreground">
                    {seasonRecord.wins}-{seasonRecord.losses} ({seasonRecord.winPct.toFixed(1)}%)
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
