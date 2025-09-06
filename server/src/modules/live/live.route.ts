import { Router } from "express";
import { livePicksStream } from "./live.controller.js";

const liveRouter = Router();

// Preflight for SSE (not typically needed but useful for some setups)
liveRouter.options("/stream", (req, res) => {
  const origin = (req.headers.origin as string) || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Last-Event-ID");
  res.status(204).end();
});

// Public stream (data itself hides unrevealed picks)
liveRouter.get("/stream", livePicksStream);

export default liveRouter;


