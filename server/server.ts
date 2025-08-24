import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import app from "./src/app.js";
import connectDB from "./src/config/database.js";
import { PORT, NODE_ENV, MONGODB_URI } from "./src/config/environment.js";
import errorHandler from "./src/middlewares/errorHandler.js";

const server = express();

// Global Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400,
  })
);
server.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  max: 100,
  message: "Too many requests, please try again later.",
});
server.use("/api/v1", limiter);

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
    });
  } catch (error) {
    console.error("Error starting the server", error);
    process.exit(1);
  }
})();
