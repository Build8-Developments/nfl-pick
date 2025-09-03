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
    } catch {}
    setIsLoading(false);
  }, []);

  const login: AuthContextValue["login"] = async (identifier, password) => {
    try {
      const res = await apiClient.post<{
        success: boolean;
        data?: { token: string; user: any };
        message?: string;
      }>("auth/login", { username: identifier, password });
      if (!res?.success || !res.data) {
        return { success: false, error: res?.message || "Login failed" } as const;
      }
      const { token, user } = res.data;
      const normalized: User = {
        id: 1,
        name: user.username ?? user.name ?? "",
        email: user.email ?? "",
        isAdmin: (user.role ?? "user") === "admin",
        avatar: user.avatar ?? undefined,
        seasonRecord: { wins: 0, losses: 0, percentage: 0 },
        weeklyWins: 0,
      };
      setCurrentUser(normalized);
      localStorage.setItem("auth-token", token);
      localStorage.setItem("nfl-picks-user", JSON.stringify(normalized));
      return { success: true, user: normalized } as const;
    } catch (e: any) {
      return { success: false, error: e?.message || "Login failed" } as const;
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
