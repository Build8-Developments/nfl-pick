import { createContext } from "react";

export type User = {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  seasonRecord: {
    wins: number;
    losses: number;
    percentage: number;
  };
  weeklyWins: number;
};

export type AuthContextValue = {
  currentUser: User | null;
  login: (
    email: string,
    password: string
  ) => { success: true; user: User } | { success: false; error: string };
  logout: () => void;
  isLoading: boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
