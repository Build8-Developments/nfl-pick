import { Router } from "express";
import { protectAdmin } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/errorHandler.middleware.js";
import {
  createUser,
  deleteUser,
  getUsers,
  getUserById,
  updateUser,
} from "./user.controller.js";
import {
  createUserSchema,
  updateUserSchema,
  validateUser,
} from "./user.validation.js";

const userRouter = Router();

userRouter.use(protectAdmin);

userRouter.get("/", asyncHandler(getUsers));

userRouter.get("/:id", asyncHandler(getUserById));

userRouter.post("/", validateUser(createUserSchema), asyncHandler(createUser));

userRouter.patch(
  "/:id",
  validateUser(updateUserSchema),
  asyncHandler(updateUser)
);

userRouter.delete("/:id", asyncHandler(deleteUser));

export default userRouter;
