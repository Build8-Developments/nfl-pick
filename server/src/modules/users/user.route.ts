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
import {
  parseMultipartData,
  validateMultipartForm,
} from "./formValidation.middleware.js";
import { checkUserExistence } from "./userExistence.middleware.js";

const userRouter = Router();

userRouter.use(protectAdmin);

userRouter.get("/", asyncHandler(getUsers));
userRouter.get("/:id", asyncHandler(getUserById));

// Avatar upload with correct middleware order:
// 1. Parse multipart data (files stored in memory)
// 2. Validate form data against Zod schema
// 3. Check if user already exists (username/email)
// 4. If user exists: return error response
// 5. If user doesn't exist: save file to disk and create user
userRouter.post(
  "/",
  parseMultipartData(), // Phase 1: Parse multipart data (files in memory)
  validateMultipartForm(createUserSchema), // Phase 2: Validate form data
  checkUserExistence, // Phase 3: Check if user exists
  asyncHandler(createUser) // Phase 4: Create user (file saved here if validation passes)
);

userRouter.patch(
  "/:id",
  validateUser(updateUserSchema),
  asyncHandler(updateUser)
);

userRouter.delete("/:id", asyncHandler(deleteUser));

export default userRouter;
