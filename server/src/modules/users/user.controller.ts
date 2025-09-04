import type { Request, Response } from "express";
import { ApiResponse } from "../../utils/ApiResponse.js";
import userService from "./user.service.js";
import fs from "fs";
import path from "path";

export const getUsers = async (req: Request, res: Response) => {
  const users = await userService.getUsers();
  res.status(200).json(ApiResponse.success(users));
};

export const getUserById = async (req: Request, res: Response) => {
  const user = await userService.getUserById(req.params.id as string);
  res.status(200).json(ApiResponse.success(user, "User fetched successfully"));
};

export const createUser = async (req: Request, res: Response) => {
  try {
    // Check if there are files in memory from multipart request
    const files = (req as any).files as Express.Multer.File[];

    if (files && Array.isArray(files) && files.length > 0) {
      const avatarFile = files.find((file) => file.fieldname === "avatar");

      if (avatarFile) {
        // Save the file to disk (directory already exists from startup)
        const uploadsDir = path.join(process.cwd(), "uploads", "avatars");

        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const filename =
          "avatar-" +
          uniqueSuffix +
          path.extname(avatarFile.originalname || "");
        const filePath = path.join(uploadsDir, filename);

        // Write file to disk
        fs.writeFileSync(filePath, avatarFile.buffer);

        // Create user with avatar path
        const avatarPath = `/uploads/avatars/${filename}`;
        const userDataWithAvatar = { ...req.body, avatar: avatarPath } as any;
        if (!userDataWithAvatar.email) delete userDataWithAvatar.email;
        const user = await userService.createUser(userDataWithAvatar);

        res
          .status(201)
          .json(
            ApiResponse.success(user, "User created successfully with avatar")
          );
      } else {
        // No avatar file found, create user without avatar
        const user = await userService.createUser(req.body);
        res
          .status(201)
          .json(ApiResponse.success(user, "User created successfully"));
      }
    } else {
      // No files, create user without avatar (existing behavior)
      const payload = { ...(req.body as any) };
      if (!payload.email) delete payload.email;
      const user = await userService.createUser(payload);
      res
        .status(201)
        .json(ApiResponse.success(user, "User created successfully"));
    }
  } catch (error: any) {
    res
      .status(500)
      .json(ApiResponse.error("Error creating user: " + error.message));
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const user = await userService.updateUser(req.params.id as string, req.body);
  res.status(200).json(ApiResponse.success(user, "User updated successfully"));
};

export const deleteUser = async (req: Request, res: Response) => {
  const user = await userService.deleteUser(req.params.id as string);
  res.status(200).json(ApiResponse.success(user, "User deleted successfully"));
};
