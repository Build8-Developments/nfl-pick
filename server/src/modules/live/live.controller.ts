import type { Request, Response } from "express";
import { EventEmitter } from "events";

export const liveEvents = new EventEmitter();
liveEvents.setMaxListeners(0);

type LiveEvent = {
  type: "pick:update" | "pick:finalize";
  payload: {
    userId: string;
    week: number;
  };
};

export const broadcastLiveEvent = (evt: LiveEvent) => {
  liveEvents.emit("message", JSON.stringify(evt));
};

export const livePicksStream = (req: Request, res: Response) => {
  // CORS headers for SSE: echo Origin and allow credentials
  const origin = (req.headers.origin as string) || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Vary", "Origin");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.status(200);
  res.flushHeaders?.();

  // Send initial event to establish stream
  res.write(`: connected\n\n`);

  const onMessage = (msg: string) => {
    res.write(`data: ${msg}\n\n`);
  };
  liveEvents.on("message", onMessage);

  // heartbeat
  const interval = setInterval(() => {
    res.write(`: ping\n\n`);
  }, 25000);

  req.on("close", () => {
    clearInterval(interval);
    liveEvents.off("message", onMessage);
    res.end();
  });
};


