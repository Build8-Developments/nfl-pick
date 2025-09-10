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

// Create test users for development
export const createTestUsers = async (req: Request, res: Response) => {
  try {
    const testUsers = [
      {
        username: "NFLFan2025",
        passwordHash: "test123",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
        role: "user",
        email: "nflfan@example.com",
        points: 150,
        totalBets: 12,
        correctBets: 8
      },
      {
        username: "PickMaster",
        passwordHash: "test123",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
        role: "user",
        email: "pickmaster@example.com",
        points: 200,
        totalBets: 15,
        correctBets: 12
      },
      {
        username: "TouchdownTom",
        passwordHash: "test123",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
        role: "user",
        email: "tom@example.com",
        points: 175,
        totalBets: 10,
        correctBets: 7
      },
      {
        username: "SpreadKing",
        passwordHash: "test123",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
        role: "user",
        email: "spreadking@example.com",
        points: 125,
        totalBets: 8,
        correctBets: 5
      },
      {
        username: "LockLegend",
        passwordHash: "test123",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
        role: "user",
        email: "legend@example.com",
        points: 300,
        totalBets: 20,
        correctBets: 18
      },
      {
        username: "FantasyGuru",
        passwordHash: "test123",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
        role: "user",
        email: "guru@example.com",
        points: 250,
        totalBets: 18,
        correctBets: 14
      },
      {
        username: "PropBetPro",
        passwordHash: "test123",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
        role: "user",
        email: "propbet@example.com",
        points: 180,
        totalBets: 14,
        correctBets: 10
      },
      {
        username: "WeekendWarrior",
        passwordHash: "test123",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
        role: "user",
        email: "warrior@example.com",
        points: 95,
        totalBets: 6,
        correctBets: 3
      }
    ];

    const createdUsers = [];
    for (const userData of testUsers) {
      try {
        const user = await userService.createUser(userData as any);
        createdUsers.push(user);
      } catch (error) {
        console.log(`User ${userData.username} might already exist, skipping...`);
      }
    }

    res.status(201).json(
      ApiResponse.success(createdUsers, `Created ${createdUsers.length} test users`)
    );
  } catch (error: any) {
    res.status(500).json(
      ApiResponse.error("Error creating test users: " + error.message)
    );
  }
};