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

    const user = await User.findOne({ username }).select("+passwordHash");
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

    const token = generateToken(user._id as ObjectId, user.role);

    // sanitize user data
    const { passwordHash, ...userData } = user.toObject();

    return res
      .status(200)
      .json(ApiResponse.success({ token, user: userData }, "Login successful"));
  } catch (err) {
    console.error("Login error:", err);
    return res
      .status(500)
      .json(ApiResponse.error("Something went wrong, please try again"));
  }
};
