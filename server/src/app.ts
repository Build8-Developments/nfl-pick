import express, { type Request, type Response } from "express";

const app = express.Router();

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    message: "OK",
    timestamp: new Date().toISOString(),
    uptime: `${process.uptime()} seconds`,
    memory: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
    nodeVersion: process.version,
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    message: "Not Found",
  });
});

export default app;
