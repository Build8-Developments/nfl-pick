import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import app from "./src/app.js";
import connectDB from "./src/config/database.js";
import { PORT, NODE_ENV, MONGODB_URI } from "./src/config/environment.js";
import errorHandler from "./src/middlewares/errorHandler.middleware.js";
import morgan from "morgan";
import cron from "node-cron";
import {
  syncWeekGames,
  syncAllPlayers,
  syncBettingOddsForAllGames,
} from "./src/modules/sync/sync.service.js";

const server = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists at startup
const uploadsDir = path.join(__dirname, "uploads", "avatars");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory: ${uploadsDir}`);
} else {
  console.log(`Uploads directory already exists: ${uploadsDir}`);
}

// Morgan logger
server.use(morgan("dev"));

// Global Middlewares
server.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
server.use(
  cors({
    // Allow specific origins for development
    origin: [
      "http://localhost:5173", // Vite dev server
      "http://localhost:3000", // Backend server
      "http://127.0.0.1:5173",
      "http://127.0.0.1:3000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Last-Event-ID"],
    maxAge: 86400,
    optionsSuccessStatus: 204,
  })
);
server.use(express.json({ limit: "10mb" }));
server.use(express.urlencoded({ extended: true }));
// Serve uploads (avatars) statically so the client can access them
server.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  max: 100,
  message: "Too many requests, please try again later.",
});
// server.use(limiter);

// Use the app routes
server.use("/api/v1", app);

// Global error handler
server.use(errorHandler);

(async () => {
  try {
    await connectDB(MONGODB_URI as string, NODE_ENV as string);
    server.listen(PORT, () => {
      console.log(
        `Server is running on http://localhost:${PORT} in ${NODE_ENV} mode`
      );
      console.log(`Health check: http://localhost:${PORT}/api/v1/health`);
      // Schedule: At 00:00 on the first Monday of every month
      // Cron format: m h dom mon dow
      cron.schedule("0 0 1-7 * 1", async () => {
        try {
          const { week, season } = await syncWeekGames();
          console.log(
            `[Scheduler] Synced NFL games for week ${week}, season ${season}`
          );

          await syncAllPlayers();
          console.log("[Scheduler] Synced NFL players");
        } catch (err) {
          console.error("[Scheduler] Failed monthly sync:", err);
        }
      });
      console.log(
        "[Scheduler] Monthly sync scheduled: 00:00 on the first Monday of each month"
      );

      // Schedule: Every Monday at 01:00 to sync betting odds for current week
      cron.schedule("0 1 * * 1", async () => {
        try {
          const result = await syncBettingOddsForAllGames();
          console.log(
            `[Scheduler] Weekly betting odds sync complete. Total games: ${result.totals.games}, synced: ${result.totals.synced}, failed: ${result.totals.failed}`
          );
        } catch (err) {
          console.error("[Scheduler] Failed weekly betting odds sync:", err);
        }
      });
      console.log(
        "[Scheduler] Weekly betting odds sync scheduled: 01:00 every Monday"
      );

      // Schedule: Every 2 minutes, resolve current week outcomes
      cron.schedule("*/2 * * * *", async () => {
        try {
          const { week } = await syncWeekGames();
          await resolveWeek(week);
          console.log(`[Scheduler] Resolved outcomes for week ${week}`);
        } catch (err) {
          console.error("[Scheduler] Failed resolving outcomes:", err);
        }
      });
      console.log("[Scheduler] Outcome resolver scheduled: every 2 minutes");
    });
  } catch (error) {
    console.error("Error starting the server", error);
    process.exit(1);
  }
})();
