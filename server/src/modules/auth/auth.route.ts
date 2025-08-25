import { Router } from "express";
import { loginSchema, validateLogin } from "./auth.validation.js";
import { login } from "./auth.controller.js";

const authRouter = Router();

authRouter.post("/login", validateLogin(loginSchema), login);

export default authRouter;
