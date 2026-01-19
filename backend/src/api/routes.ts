import { Router, type Request, type Response, type NextFunction } from "express";
import { BlockchainService } from "../services/blockchain.js";
import { CofheService } from "../services/cofhe.js";
import { auditLogger } from "../services/auditLogger.js";
import { config } from "../config/index.js";
import {
  SwapIngestRequestSchema,
  TransactionIngestRequestSchema,
  type SwapIngestRequest,
  type TransactionIngestRequest,
} from "../types/index.js";

const router = Router();

let blockchain: BlockchainService;
let cofhe: CofheService;

interface TimeseriesPoint {
  timestamp: number;
  type: "swap" | "transaction";
  volume: number;
  fee: number;
  metadata: Record<string, string>;
}

const timeseries: TimeseriesPoint[] = [];

export function initializeServices() {
  blockchain = new BlockchainService();
  cofhe = new CofheService(blockchain);
}

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function getTimeframeStart(timeframe: string): number {
  const now = Date.now();
  switch (timeframe) {
    case "1h": return now - 60 * 60 * 1000;
    case "24h": return now - 24 * 60 * 60 * 1000;
    case "7d": return now - 7 * 24 * 60 * 60 * 1000;
    case "30d": return now - 30 * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

function filterByTimeframe(data: TimeseriesPoint[], timeframe: string): TimeseriesPoint[] {
  const start = getTimeframeStart(timeframe);
  return data.filter(p => p.timestamp >= start);
}

router.get("/health", asyncHandler(async (_req: Request, res: Response) => {
  const [swapMetadata, txMetadata] = await Promise.all([
    blockchain.getSwapMetadata(),
    blockchain.getTransactionMetadata(),
  ]);

  res.json({
    status: "operational",
    version: "2.0.0",
    chainId: config.chainId,
    contractAddress: config.contractAddress,
    swapCount: swapMetadata.count,
    transactionCount: txMetadata.count,
    timestamp: Date.now(),
  });
}));

router.get("/keys/config", (_req: Request, res: Response) => {
  res.json(cofhe.getChainConfig());
});

router.post("/ingest/swap", asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const parsed = SwapIngestRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.format(),
    });
    return;
  }

  const data: SwapIngestRequest = parsed.data;

  try {
    const txHash = await blockchain.ingestSwap(
      data.encryptedAmountIn,
      data.encryptedFee,
      data.destinationAsset,
      data.platform
    );

    timeseries.push({
      timestamp: Date.now(),
      type: "swap",
      volume: data.amountHint ?? 0,
      fee: data.feeHint ?? 0,
      metadata: {
        destination: data.destinationAsset,
        platform: data.platform,
      },
    });

    auditLogger.logIngest({
      type: "swap",
      requestIp: req.ip,
      txHash,
      duration: Date.now() - startTime,
      result: "success",
    });

    res.status(201).json({
      status: "success",
      transactionHash: txHash,
    });
  } catch (error) {
    auditLogger.logIngest({
      type: "swap",
      requestIp: req.ip,
      duration: Date.now() - startTime,
      result: "failure",
      error: (error as Error).message,
    });
    throw error;
  }
}));

router.post("/ingest/transaction", asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const parsed = TransactionIngestRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.format(),
    });
    return;
  }

  const data: TransactionIngestRequest = parsed.data;

  try {
    const txHash = await blockchain.ingestTransaction(
      data.encryptedAmount,
      data.encryptedFee,
      data.transactionType,
      data.poolType || "",
      data.platform
    );

    timeseries.push({
      timestamp: Date.now(),
      type: "transaction",
      volume: data.amountHint ?? 0,
      fee: data.feeHint ?? 0,
      metadata: {
        txType: data.transactionType,
        pool: data.poolType || "",
        platform: data.platform,
      },
    });

    auditLogger.logIngest({
      type: "transaction",
      requestIp: req.ip,
      txHash,
      duration: Date.now() - startTime,
      result: "success",
    });

    res.status(201).json({
      status: "success",
      transactionHash: txHash,
    });
  } catch (error) {
    auditLogger.logIngest({
      type: "transaction",
      requestIp: req.ip,
      duration: Date.now() - startTime,
      result: "failure",
      error: (error as Error).message,
    });
    throw error;
  }
}));

router.get("/analytics/swaps", asyncHandler(async (req: Request, res: Response) => {
  const timeframe = (req.query.timeframe as string) || "all";
  const metadata = await blockchain.getSwapMetadata();

  if (timeframe === "all") {
    res.json({
      count: metadata.count,
      byDestination: metadata.byDestination,
      byPlatform: metadata.byPlatform,
      lastTimestamp: metadata.lastTimestamp,
      timeframe,
    });
    return;
  }

  const filtered = filterByTimeframe(timeseries, timeframe).filter(p => p.type === "swap");
  const byDestination: Record<string, number> = {};
  const byPlatform: Record<string, number> = {};

  for (const point of filtered) {
    const dest = point.metadata.destination;
    const plat = point.metadata.platform;
    byDestination[dest] = (byDestination[dest] || 0) + 1;
    byPlatform[plat] = (byPlatform[plat] || 0) + 1;
  }

  res.json({
    count: filtered.length,
    byDestination,
    byPlatform,
    lastTimestamp: filtered.length > 0 ? Math.max(...filtered.map(p => p.timestamp)) / 1000 : 0,
    timeframe,
  });
}));

router.get("/analytics/transactions", asyncHandler(async (req: Request, res: Response) => {
  const timeframe = (req.query.timeframe as string) || "all";
  const metadata = await blockchain.getTransactionMetadata();

  if (timeframe === "all") {
    res.json({
      count: metadata.count,
      byType: metadata.byType,
      byPool: metadata.byPool,
      byPlatform: metadata.byPlatform,
      lastTimestamp: metadata.lastTimestamp,
      timeframe,
    });
    return;
  }

  const filtered = filterByTimeframe(timeseries, timeframe).filter(p => p.type === "transaction");
  const byType: Record<string, number> = {};
  const byPool: Record<string, number> = {};
  const byPlatform: Record<string, number> = {};

  for (const point of filtered) {
    const t = point.metadata.txType;
    const pool = point.metadata.pool;
    const plat = point.metadata.platform;
    if (t) byType[t] = (byType[t] || 0) + 1;
    if (pool) byPool[pool] = (byPool[pool] || 0) + 1;
    if (plat) byPlatform[plat] = (byPlatform[plat] || 0) + 1;
  }

  res.json({
    count: filtered.length,
    byType,
    byPool,
    byPlatform,
    lastTimestamp: filtered.length > 0 ? Math.max(...filtered.map(p => p.timestamp)) / 1000 : 0,
    timeframe,
  });
}));

router.get("/analytics/swaps/aggregate", asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const timeframe = (req.query.timeframe as string) || "all";

  try {
    if (timeframe === "all") {
      const permit = await cofhe.getOrCreatePermit();
      const aggregates = await cofhe.decryptSwapAggregates(permit);

      auditLogger.logDecryption({
        type: "swap",
        requestIp: req.ip,
        userAgent: req.headers["user-agent"],
        duration: Date.now() - startTime,
        result: "success",
        decryptedValues: {
          totalVolume: aggregates.totalVolumeZec,
          totalFees: aggregates.totalFeesZec,
          count: aggregates.swapCount,
        },
      });

      res.json({ ...aggregates, timeframe });
      return;
    }

    const filtered = filterByTimeframe(timeseries, timeframe).filter(p => p.type === "swap");
    const totalVolume = filtered.reduce((sum, p) => sum + p.volume, 0);
    const totalFees = filtered.reduce((sum, p) => sum + p.fee, 0);

    res.json({
      totalVolumeZec: totalVolume / 1e8,
      totalFeesZec: totalFees / 1e8,
      swapCount: filtered.length,
      timeframe,
    });
  } catch (error) {
    auditLogger.logDecryption({
      type: "swap",
      requestIp: req.ip,
      userAgent: req.headers["user-agent"],
      duration: Date.now() - startTime,
      result: "failure",
      error: (error as Error).message,
    });
    throw error;
  }
}));

router.get("/analytics/transactions/aggregate", asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const timeframe = (req.query.timeframe as string) || "all";

  try {
    if (timeframe === "all") {
      const permit = await cofhe.getOrCreatePermit();
      const aggregates = await cofhe.decryptTransactionAggregates(permit);

      auditLogger.logDecryption({
        type: "transaction",
        requestIp: req.ip,
        userAgent: req.headers["user-agent"],
        duration: Date.now() - startTime,
        result: "success",
        decryptedValues: {
          totalVolume: aggregates.totalVolumeZec,
          totalFees: aggregates.totalFeesZec,
          count: aggregates.transactionCount,
        },
      });

      res.json({ ...aggregates, timeframe });
      return;
    }

    const filtered = filterByTimeframe(timeseries, timeframe).filter(p => p.type === "transaction");
    const totalVolume = filtered.reduce((sum, p) => sum + p.volume, 0);
    const totalFees = filtered.reduce((sum, p) => sum + p.fee, 0);

    res.json({
      totalVolumeZec: totalVolume / 1e8,
      totalFeesZec: totalFees / 1e8,
      transactionCount: filtered.length,
      timeframe,
    });
  } catch (error) {
    auditLogger.logDecryption({
      type: "transaction",
      requestIp: req.ip,
      userAgent: req.headers["user-agent"],
      duration: Date.now() - startTime,
      result: "failure",
      error: (error as Error).message,
    });
    throw error;
  }
}));

router.get("/analytics/timeseries", asyncHandler(async (req: Request, res: Response) => {
  const timeframe = (req.query.timeframe as string) || "24h";
  const filtered = filterByTimeframe(timeseries, timeframe);

  const bucketSize = timeframe === "1h" ? 5 * 60 * 1000 :
                     timeframe === "24h" ? 60 * 60 * 1000 :
                     timeframe === "7d" ? 6 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

  const buckets: Record<number, { swaps: number; transactions: number; volume: number }> = {};
  const start = getTimeframeStart(timeframe);
  const now = Date.now();

  for (let t = start; t <= now; t += bucketSize) {
    buckets[t] = { swaps: 0, transactions: 0, volume: 0 };
  }

  for (const point of filtered) {
    const bucket = Math.floor(point.timestamp / bucketSize) * bucketSize;
    if (buckets[bucket]) {
      if (point.type === "swap") buckets[bucket].swaps++;
      else buckets[bucket].transactions++;
      buckets[bucket].volume += point.volume / 1e8;
    }
  }

  const data = Object.entries(buckets)
    .map(([ts, values]) => ({
      timestamp: parseInt(ts),
      ...values,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  res.json({ data, timeframe });
}));

router.get("/analytics/combined", asyncHandler(async (req: Request, res: Response) => {
  const timeframe = (req.query.timeframe as string) || "all";

  const [swapMetadata, txMetadata] = await Promise.all([
    blockchain.getSwapMetadata(),
    blockchain.getTransactionMetadata(),
  ]);

  const permit = await cofhe.getOrCreatePermit();

  const [swapAggregates, txAggregates] = await Promise.all([
    cofhe.decryptSwapAggregates(permit),
    cofhe.decryptTransactionAggregates(permit),
  ]);

  res.json({
    swaps: {
      ...swapAggregates,
      byDestination: swapMetadata.byDestination,
      byPlatform: swapMetadata.byPlatform,
    },
    transactions: {
      ...txAggregates,
      byType: txMetadata.byType,
      byPool: txMetadata.byPool,
      byPlatform: txMetadata.byPlatform,
    },
    timeframe,
  });
}));

export { router };
