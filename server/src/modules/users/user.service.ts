import { NotFoundError } from "../../utils/errors.js";
import User, { type IUser } from "./user.model.js";

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

const updateUser = async (userId: string, body: IUser) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  Object.assign(user, body);

  await user.save();

  return user;
};

const deleteUser = async (userId: string) => {
  const user = await User.findByIdAndDelete(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return user;
};

export default {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
