import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import { type AuthContextValue, type User } from "./AuthContext";
import { apiClient } from "../lib/api";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Validate session with server
    const validateSession = async () => {
      try {
        const res = await apiClient.get<{
          success: boolean;
          data?: { user: Record<string, unknown> };
          message?: string;
        }>("auth/validate");
        
        if (res?.success && res.data) {
          const { user } = res.data;
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
              percentage: (user.winRate as number) ?? 0,
            },
            weeklyWins: (user.weeklyWins as number) ?? 0,
          };
          setCurrentUser(normalized);
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        // Only log errors that are not 401 (unauthorized) to avoid spam
        if (error instanceof Error && !error.message.includes('401')) {
          console.error("Session validation failed:", error);
        }
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    validateSession();
  }, []);

  const login: AuthContextValue["login"] = async (identifier, password) => {
    try {
      const res = await apiClient.post<{
        success: boolean;
        data?: { user: Record<string, unknown> };
        message?: string;
      }>("auth/login", { username: identifier, password });
      if (!res?.success || !res.data) {
        return {
          success: false,
          error: res?.message || "Login failed",
        } as const;
      }
      const { user } = res.data;
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
      // No need to store in localStorage - using server sessions
      return { success: true, user: normalized } as const;
    } catch (e: unknown) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Login failed",
      } as const;
    }
  };

  const logout: AuthContextValue["logout"] = async () => {
    try {
      await apiClient.post("auth/logout");
      setCurrentUser(null);
      return { success: true } as const;
    } catch (e: unknown) {
      // Even if the server logout fails, clear local state
      setCurrentUser(null);
      return {
        success: false,
        error: e instanceof Error ? e.message : "Logout failed",
      } as const;
    }
  };

  const devLoginMock: AuthContextValue["devLoginMock"] = (user) => {
    setCurrentUser(user);
    // No need to store in localStorage - using server sessions
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
