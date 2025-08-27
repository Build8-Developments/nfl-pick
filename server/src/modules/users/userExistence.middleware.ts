import type { NextFunction, Request, Response } from "express";
import { ApiResponse } from "../../utils/ApiResponse.js";
import User from "./user.model.js";

export const checkUserExistence = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { username } = req.body;

    const existingUser = await User.findOne({
      $or: [{ username: username?.toLowerCase() }],
    });

    if (existingUser) {
      return res.status(409).json(
        ApiResponse.error("User already exists", {
          username:
            existingUser.username === username?.toLowerCase()
              ? "Username already taken"
              : undefined,
        })
      );
    }

    next();
  } catch (error: any) {
    res.status(500).json(ApiResponse.error("Error checking user existence"));
  }
};
