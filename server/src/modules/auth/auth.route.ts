import { Router } from "express";
import { loginSchema, validateLogin } from "./auth.validation.js";
import { login, logout, validateSession } from "./auth.controller.js";

const authRouter = Router();

authRouter.post("/login", validateLogin(loginSchema), login);
authRouter.post("/logout", logout);
authRouter.get("/validate", validateSession);

export default authRouter;
