import type { NextFunction, Request, Response } from "express";
import { ApiResponse } from "../../utils/ApiResponse.js";
import User from "./user.model.js";

// Middleware to check if user already exists
export const checkUserExistence = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { username, email } = req.body;

    // Check if user exists by username or email
    const existingUser = await User.findOne({
      $or: [
        { username: username?.toLowerCase() },
        { email: email?.toLowerCase() },
      ],
    });

    if (existingUser) {
      // User already exists, return error response
      return res.status(409).json(
        ApiResponse.error("User already exists", {
          username:
            existingUser.username === username?.toLowerCase()
              ? "Username already taken"
              : undefined,
          email:
            existingUser.email === email?.toLowerCase()
              ? "Email already registered"
              : undefined,
        })
      );
    }

    // User doesn't exist, continue with the flow
    next();
  } catch (error: any) {
    res.status(500).json(ApiResponse.error("Error checking user existence"));
  }
};
