import { Request, Response, NextFunction } from "express";
import { config } from "../config/index.js";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

function getClientKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0] : req.ip;
  return ip || "unknown";
}

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetTime < now) {
      store.delete(key);
    }
  }
}

setInterval(cleanup, 60000);

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const key = getClientKey(req);
  const now = Date.now();

  let entry = store.get(key);

  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.rateLimitWindowMs,
    };
  }

  entry.count++;
  store.set(key, entry);

  const remaining = Math.max(0, config.rateLimitMaxRequests - entry.count);
  const resetSeconds = Math.ceil((entry.resetTime - now) / 1000);

  res.setHeader("X-RateLimit-Limit", config.rateLimitMaxRequests);
  res.setHeader("X-RateLimit-Remaining", remaining);
  res.setHeader("X-RateLimit-Reset", resetSeconds);

  if (entry.count > config.rateLimitMaxRequests) {
    res.status(429).json({
      error: "Too many requests",
      retryAfter: resetSeconds,
    });
    return;
  }

  next();
}
