import { Router } from "express";
import { protectAdmin } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/errorHandler.middleware.js";
import {
  createUser,
  createTestUsers,
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
import {
  parseMultipartData,
  validateMultipartForm,
} from "./formValidation.middleware.js";
import { checkUserExistence } from "./userExistence.middleware.js";

const userRouter = Router();

userRouter.use(protectAdmin);

userRouter.get("/", asyncHandler(getUsers));
userRouter.get("/:id", asyncHandler(getUserById));

userRouter.post(
  "/",
  parseMultipartData(),
  validateMultipartForm(createUserSchema),
  checkUserExistence,
  asyncHandler(createUser)
);

userRouter.patch(
  "/:id",
  validateUser(updateUserSchema),
  asyncHandler(updateUser)
);

userRouter.delete("/:id", asyncHandler(deleteUser));

// Test endpoint for creating sample users
userRouter.post("/test-users", asyncHandler(createTestUsers));

export default userRouter;
