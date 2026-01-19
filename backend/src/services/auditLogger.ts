import { pino } from "pino";
import { config } from "../config/index.js";

interface AuditLogEntry {
  timestamp: string;
  action: string;
  chainId: number;
  contractAddress: string;
  permitHash?: string;
  requestIp?: string;
  userAgent?: string;
  result: "success" | "failure";
  duration?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

const logger = pino({
  level: "info",
  transport: config.nodeEnv !== "production" ? {
    target: "pino-pretty",
    options: { colorize: true },
  } : undefined,
  base: { service: "zcash-fhe-analytics-audit" },
});

class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogSize = 10000;

  log(entry: Omit<AuditLogEntry, "timestamp">) {
    const fullEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    this.logs.push(fullEntry);
    if (this.logs.length > this.maxLogSize) {
      this.logs.shift();
    }

    if (entry.result === "success") {
      logger.info(fullEntry, `Audit: ${entry.action}`);
    } else {
      logger.error(fullEntry, `Audit: ${entry.action} failed`);
    }
  }

  logDecryption(params: {
    type: "swap" | "transaction";
    permitHash?: string;
    requestIp?: string;
    userAgent?: string;
    duration: number;
    result: "success" | "failure";
    error?: string;
    decryptedValues?: {
      totalVolume?: number;
      totalFees?: number;
      count?: number;
    };
  }) {
    this.log({
      action: `decrypt_${params.type}_aggregates`,
      chainId: config.chainId,
      contractAddress: config.contractAddress,
      permitHash: params.permitHash,
      requestIp: params.requestIp,
      userAgent: params.userAgent,
      result: params.result,
      duration: params.duration,
      error: params.error,
      metadata: params.decryptedValues,
    });
  }

  logIngest(params: {
    type: "swap" | "transaction";
    requestIp?: string;
    txHash?: string;
    duration: number;
    result: "success" | "failure";
    error?: string;
  }) {
    this.log({
      action: `ingest_${params.type}`,
      chainId: config.chainId,
      contractAddress: config.contractAddress,
      requestIp: params.requestIp,
      result: params.result,
      duration: params.duration,
      error: params.error,
      metadata: { transactionHash: params.txHash },
    });
  }

  getRecentLogs(limit: number = 100): AuditLogEntry[] {
    return this.logs.slice(-limit);
  }

  getLogsByAction(action: string, limit: number = 100): AuditLogEntry[] {
    return this.logs
      .filter((log) => log.action === action)
      .slice(-limit);
  }
}

export const auditLogger = new AuditLogger();
