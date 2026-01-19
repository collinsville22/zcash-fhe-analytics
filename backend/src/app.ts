import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config/index.js";
import { router } from "./api/routes.js";
import { rateLimiter } from "./middleware/rateLimiter.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: config.corsOrigins === "*" ? "*" : config.corsOrigins.split(","),
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));
  app.use(express.json({ limit: "1mb" }));
  app.use(rateLimiter);

  app.use("/api", router);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({
      error: config.nodeEnv === "production" ? "Internal server error" : err.message,
    });
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}
