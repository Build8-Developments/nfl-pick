import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import { type AuthContextValue, type User } from "./AuthContext";
import { apiClient } from "../lib/api";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Hydrate session from storage
    try {
      const storedUser = localStorage.getItem("nfl-picks-user");
      if (storedUser) {
        const userData = JSON.parse(storedUser) as User;
        setCurrentUser(userData);
      }
    } catch {
      // Ignore localStorage errors
    }
    setIsLoading(false);
  }, []);

  const login: AuthContextValue["login"] = async (identifier, password) => {
    try {
      const res = await apiClient.post<{
        success: boolean;
        data?: { token: string; user: Record<string, unknown> };
        message?: string;
      }>("auth/login", { username: identifier, password });
      if (!res?.success || !res.data) {
        return {
          success: false,
          error: res?.message || "Login failed",
        } as const;
      }
      const { token, user } = res.data;
      const normalized: User = {
        id: (user._id as string) ?? (user.id as string) ?? "",
        name: (user.username as string) ?? (user.name as string) ?? "",
        email: (user.email as string) ?? "",
        isAdmin: ((user.role as string) ?? "user") === "admin",
        avatar: (user.avatar as string) ?? undefined,
        seasonRecord: {
          wins: (user.correctBets as number) ?? 0,
          losses:
            ((user.totalBets as number) ?? 0) -
            ((user.correctBets as number) ?? 0),
          percentage: (user.winRate as number)
            ? (user.winRate as number) / 100
            : 0,
        },
        weeklyWins: 0, // This will be calculated from recent picks
        points: (user.points as number) ?? 0,
        totalBets: (user.totalBets as number) ?? 0,
        correctBets: (user.correctBets as number) ?? 0,
        winRate: (user.winRate as number) ?? 0,
      };
      setCurrentUser(normalized);
      localStorage.setItem("auth-token", token);
      localStorage.setItem("nfl-picks-user", JSON.stringify(normalized));
      return { success: true, user: normalized } as const;
    } catch (e: unknown) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Login failed",
      } as const;
    }
  };

  const devLoginMock: AuthContextValue["devLoginMock"] = (user) => {
    setCurrentUser(user);
    localStorage.setItem("nfl-picks-user", JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("nfl-picks-user");
    localStorage.removeItem("auth-token");
  };

  const value: AuthContextValue = {
    currentUser,
    login,
    devLoginMock,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
