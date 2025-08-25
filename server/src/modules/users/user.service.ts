import { NotFoundError } from "../../utils/errors.js";
import User, { type IUser } from "./user.model.js";
import { getAvatarUrl } from "./upload.middleware.js";
import type { Express } from "express";
import fs from "fs";
import path from "path";

const getUsers = async () => {
  const users = await User.find();
  if (!users) {
    throw new NotFoundError("Users not found");
  }
  return users;
};

const getUserById = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return user;
};

const createUser = async (body: IUser) => {
  const user = await User.create(body);
  return user;
};

const createUserWithAvatar = async (
  userData: Partial<IUser>,
  avatarFile?: Express.Multer.File
) => {
  let avatarPath = "https://placehold.co/64x64"; // Default avatar

  if (avatarFile) {
    // Use the uploaded file path
    avatarPath = getAvatarUrl(avatarFile.filename);
  }

  // Create user with avatar path
  const userDataWithAvatar = { ...userData, avatar: avatarPath };
  const user = await User.create(userDataWithAvatar);
  return user;
};

const updateUser = async (userId: string, body: IUser) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  // If avatar is being updated and it's different from current, delete old file
  if (
    body.avatar &&
    body.avatar !== user.avatar &&
    user.avatar !== "https://placehold.co/64x64"
  ) {
    deleteAvatarFile(user.avatar);
  }

  Object.assign(user, body);

  await user.save();

  return user;
};

// Helper function to extract avatar filename from URL
const extractAvatarFilename = (
  avatarUrl: string | undefined
): string | null => {
  if (!avatarUrl || avatarUrl === "https://placehold.co/64x64") {
    return null; // Default avatar, no file to delete
  }

  // Extract filename from /uploads/avatars/filename.ext
  const match = avatarUrl.match(/\/uploads\/avatars\/(.+)$/);
  return match && match[1] ? match[1] : null;
};

// Helper function to delete avatar file
const deleteAvatarFile = (avatarUrl: string | undefined): void => {
  const filename = extractAvatarFilename(avatarUrl);
  if (!filename) return; // No file to delete

  try {
    const filePath = path.join(process.cwd(), "uploads", "avatars", filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error("Error deleting avatar file:", error);
    // Don't throw error, just log it
  }
};

const deleteUser = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Delete avatar file if it exists
  if (user.avatar && user.avatar !== "https://placehold.co/64x64") {
    deleteAvatarFile(user.avatar);
  }

  // Delete the user
  const deletedUser = await User.findByIdAndDelete(userId);
  return deletedUser;
};

export default {
  getUsers,
  getUserById,
  createUser,
  createUserWithAvatar,
  updateUser,
  deleteUser,
};
