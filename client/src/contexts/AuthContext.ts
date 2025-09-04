import { createContext } from "react";

export type User = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  avatar?: string;
  seasonRecord: {
    wins: number;
    losses: number;
    percentage: number;
  };
  weeklyWins: number;
  points?: number;
  totalBets?: number;
  correctBets?: number;
  winRate?: number;
};

export type AuthContextValue = {
  currentUser: User | null;
  login: (
    identifier: string,
    password: string
  ) => Promise<
    { success: true; user: User } | { success: false; error: string }
  >;
  devLoginMock: (user: User) => void;
  logout: () => void;
  isLoading: boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
