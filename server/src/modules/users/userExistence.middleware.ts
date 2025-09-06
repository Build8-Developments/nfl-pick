import type { NextFunction, Request, Response } from "express";
import { ApiResponse } from "../../utils/ApiResponse.js";
import User from "./user.model.js";

export const checkUserExistence = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { username, email } = req.body as { username?: string; email?: string };

    const query: any = { $or: [] as any[] };
    if (username) query.$or.push({ username: username.toLowerCase() });
    if (email) query.$or.push({ email: email.toLowerCase() });

    const existingUser = query.$or.length > 0 ? await User.findOne(query) : null;

    if (existingUser) {
      return res.status(409).json(ApiResponse.error("User already exists", {
        username:
          username && existingUser.username === username.toLowerCase()
            ? "Username already taken"
            : undefined,
        email:
          email && (existingUser as any).email === email.toLowerCase()
            ? "Email already in use"
            : undefined,
      }));
    }

    next();
  } catch (error: any) {
    res.status(500).json(ApiResponse.error("Error checking user existence"));
  }
};
