import { Router } from "express";
import { protect, protectAdmin } from "../../middlewares/auth.middleware.js";
import { resolveProps } from "./admin.controller.js";

const adminRouter = Router();

adminRouter.use(protect, protectAdmin);

adminRouter.post("/resolve-props", resolveProps);

export default adminRouter;


