import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { users } from "../data/mockData";
import { AuthContext } from "./AuthContext";
import { type AuthContextValue, type User } from "./AuthContext";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem("nfl-picks-user");
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      const user = users.find((u) => u.id === userData.id);
      if (user) {
        setCurrentUser(user);
      }
    }
    setIsLoading(false);
  }, []);

  const login: AuthContextValue["login"] = (email, _password) => {
    void _password;
    // Simple mock authentication
    const user = users.find((u) => u.email === email);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem("nfl-picks-user", JSON.stringify({ id: user.id }));
      return { success: true, user };
    }
    return { success: false, error: "Invalid credentials" };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("nfl-picks-user");
  };

  const value: AuthContextValue = {
    currentUser,
    login,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
