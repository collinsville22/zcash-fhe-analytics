import { pino } from "pino";
import { pinoHttp } from "pino-http";
import { config } from "./config/index.js";
import { initializeServices } from "./api/routes.js";
import { createApp } from "./app.js";

const logger = pino({
  level: config.nodeEnv === "production" ? "info" : "debug",
  transport: config.nodeEnv !== "production" ? {
    target: "pino-pretty",
    options: { colorize: true },
  } : undefined,
});

const app = createApp();
app.use(pinoHttp({ logger }));

async function start() {
  try {
    logger.info("Initializing services...");
    initializeServices();

    app.listen(config.port, "0.0.0.0", () => {
      logger.info({
        port: config.port,
        chainId: config.chainId,
        contract: config.contractAddress,
      }, "Server started");
    });
  } catch (error) {
    logger.fatal({ error }, "Failed to start server");
    process.exit(1);
  }
}

start();
