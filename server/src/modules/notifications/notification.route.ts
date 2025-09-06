import { Router } from "express";
import { protectAdmin } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/errorHandler.middleware.js";
import { sendTestNotifications } from "./notification.controller.js";

const notificationRouter = Router();

// Test endpoint for sending notifications (admin only)
notificationRouter.post("/test", protectAdmin, asyncHandler(sendTestNotifications));

export default notificationRouter;
