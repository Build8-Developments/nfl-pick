import React, { createContext, useContext, useState, useEffect } from "react";
import { users } from "../data/mockData";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const login = (email, password) => {
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

  const value = {
    currentUser,
    login,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
