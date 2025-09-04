import type { Request, Response, NextFunction } from "express";

type KeyFn = (req: Request) => string;

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyGenerator?: KeyFn;
}

const buckets = new Map<string, { count: number; resetAt: number }>();

export const rateLimit = (options: RateLimitOptions) => {
  const { windowMs, max, keyGenerator } = options;
  const getKey: KeyFn = keyGenerator ?? ((req) => {
    const userId = (req as any).user?._id || "anon";
    return `${req.method}:${req.path}:${userId}`;
  });

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip read-only methods to avoid throttling live views and polling
      if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
        return next();
      }
      const key = getKey(req);
      const now = Date.now();
      let bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + windowMs };
        buckets.set(key, bucket);
      }

      bucket.count += 1;
      const remaining = Math.max(0, max - bucket.count);
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", String(remaining));
      res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

      if (bucket.count > max) {
        return res.status(429).json({
          success: false,
          message: "Too many requests. Please slow down.",
        });
      }

      next();
    } catch {
      next();
    }
  };
};


