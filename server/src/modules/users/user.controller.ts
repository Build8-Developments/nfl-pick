import type { Request, Response } from "express";
import { ApiResponse } from "../../utils/apiResponse.js";
import userService from "./user.service.js";

export const getUsers = async (req: Request, res: Response) => {
  const users = await userService.getUsers();
  res.status(200).json(ApiResponse.success(users));
};

export const getUserById = async (req: Request, res: Response) => {
  const user = await userService.getUserById(req.params.id as string);
  res.status(200).json(ApiResponse.success(user, "User fetched successfully"));
};

export const createUser = async (req: Request, res: Response) => {
  const user = await userService.createUser(req.body);
  res.status(201).json(ApiResponse.success(user, "User created successfully"));
};

export const updateUser = async (req: Request, res: Response) => {
  const user = await userService.updateUser(req.params.id as string, req.body);
  res.status(200).json(ApiResponse.success(user, "User updated successfully"));
};

export const deleteUser = async (req: Request, res: Response) => {
  const user = await userService.deleteUser(req.params.id as string);
  res.status(200).json(ApiResponse.success(user, "User deleted successfully"));
};
