import type { Request, Response } from "express";
import User, { type IUser } from "../users/user.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../../config/jwt.js";
import type { IUserLogin } from "../../types/user/User.js";
import type { ObjectId } from "mongoose";

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as IUserLogin;
    // Allow login by username OR email (identifier comes in username field)
    const user = await User.findOne({
      $or: [{ username }, { email: username }],
    }).select("+passwordHash");
    if (!user) {
      return res
        .status(401)
        .json(ApiResponse.error("Invalid username or password"));
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json(ApiResponse.error("Invalid username or password"));
    }

    // Generate token for session storage
    const token = generateToken(user._id as ObjectId, user.role);

    // Store user info in session
    const session = req.session as any;
    session.userId = (user._id as ObjectId).toString();
    session.userRole = user.role;
    session.token = token;
    session.isAuthenticated = true;
    
    // Debug logging
    console.log("Login - session set:", {
      userId: session.userId,
      userRole: session.userRole,
      isAuthenticated: session.isAuthenticated,
      hasToken: !!session.token,
      sessionID: req.sessionID
    });
    
    // Force session save
    session.save((err: any) => {
      if (err) {
        console.error("Session save error:", err);
      } else {
        console.log("Session saved successfully");
      }
    });

    // sanitize user data
    const { passwordHash, ...userData } = user.toObject();

    return res
      .status(200)
      .json(ApiResponse.success({ user: userData }, "Login successful"));
  } catch (err) {
    console.error("Login error:", err);
    return res
      .status(500)
      .json(ApiResponse.error("Something went wrong, please try again"));
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    // Clear the session
    const session = req.session as any;
    session.destroy((err: any) => {
      if (err) {
        console.error("Session destruction error:", err);
        return res
          .status(500)
          .json(ApiResponse.error("Logout failed"));
      }
      
      // Clear the session cookie
      res.clearCookie("nfl-picks-session");
      return res
        .status(200)
        .json(ApiResponse.success(null, "Logout successful"));
    });
  } catch (err) {
    console.error("Logout error:", err);
    return res
      .status(500)
      .json(ApiResponse.error("Something went wrong, please try again"));
  }
};

export const validateSession = async (req: Request, res: Response) => {
  try {
    const session = req.session as any;
    
    // Debug logging
    console.log("Session validation - session exists:", !!session);
    console.log("Session validation - isAuthenticated:", session?.isAuthenticated);
    console.log("Session validation - userId:", session?.userId);
    console.log("Session validation - session keys:", session ? Object.keys(session) : "no session");
    console.log("Session validation - sessionID:", req.sessionID);
    console.log("Session validation - cookies:", req.headers.cookie);
    
    // Check if session exists and has required data
    if (!session || !session.isAuthenticated || !session.userId) {
      console.log("Session validation failed - missing session data");
      return res
        .status(401)
        .json(ApiResponse.error("Not authenticated"));
    }

    // Get fresh user data from database
    const user = await User.findById(session.userId).select("-passwordHash");
    if (!user) {
      // User was deleted, clear session
      console.log("Session validation failed - user not found in database");
      session.destroy(() => {});
      return res
        .status(401)
        .json(ApiResponse.error("User not found"));
    }

    // Return user data
    const { passwordHash, ...userData } = user.toObject();
    console.log("Session validation successful for user:", user.username);
    return res
      .status(200)
      .json(ApiResponse.success({ user: userData }, "Session valid"));
  } catch (err) {
    console.error("Session validation error:", err);
    return res
      .status(500)
      .json(ApiResponse.error("Session validation failed"));
  }
};
