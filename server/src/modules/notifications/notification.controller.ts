import type { Request, Response } from "express";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { notificationService } from "../../services/notification.service.js";

// Test endpoint to send notifications (admin only)
export const sendTestNotifications = async (req: Request, res: Response) => {
  try {
    const { week, type } = req.body;
    
    if (!week || !type) {
      return res
        .status(400)
        .json(ApiResponse.error("Missing week or type parameter"));
    }

    if (!["1hour", "10min"].includes(type)) {
      return res
        .status(400)
        .json(ApiResponse.error("Type must be '1hour' or '10min'"));
    }

    await notificationService.sendTestReminders(Number(week), type as "1hour" | "10min");

    return res
      .status(200)
      .json(ApiResponse.success(null, `Test ${type} notifications sent for week ${week}`));
  } catch (error) {
    console.error("[NOTIFICATIONS] Error sending test notifications:", error);
    return res
      .status(500)
      .json(ApiResponse.error("Failed to send test notifications"));
  }
};
