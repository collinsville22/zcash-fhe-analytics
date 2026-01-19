import { z } from "zod";

export const SwapIngestRequestSchema = z.object({
  encryptedAmountIn: z.object({
    ctHash: z.string(),
    securityZone: z.number(),
    utype: z.number(),
    signature: z.string(),
  }),
  encryptedFee: z.object({
    ctHash: z.string(),
    securityZone: z.number(),
    utype: z.number(),
    signature: z.string(),
  }),
  destinationAsset: z.string().min(1).max(32),
  platform: z.string().min(1).max(32),
  timestamp: z.number().optional(),
  amountHint: z.number().optional(),
  feeHint: z.number().optional(),
});

export const TransactionIngestRequestSchema = z.object({
  encryptedAmount: z.object({
    ctHash: z.string(),
    securityZone: z.number(),
    utype: z.number(),
    signature: z.string(),
  }),
  encryptedFee: z.object({
    ctHash: z.string(),
    securityZone: z.number(),
    utype: z.number(),
    signature: z.string(),
  }),
  transactionType: z.string().min(1).max(32),
  poolType: z.string().max(32).optional(),
  platform: z.string().min(1).max(32),
  timestamp: z.number().optional(),
  amountHint: z.number().optional(),
  feeHint: z.number().optional(),
});

export const DecryptRequestSchema = z.object({
  permitHash: z.string().optional(),
});

export type SwapIngestRequest = z.infer<typeof SwapIngestRequestSchema>;
export type TransactionIngestRequest = z.infer<typeof TransactionIngestRequestSchema>;
export type DecryptRequest = z.infer<typeof DecryptRequestSchema>;

export interface EncryptedInput {
  ctHash: string;
  securityZone: number;
  utype: number;
  signature: string;
}

export interface SwapMetadata {
  count: number;
  byDestination: Record<string, number>;
  byPlatform: Record<string, number>;
  lastTimestamp: number;
}

export interface TransactionMetadata {
  count: number;
  byType: Record<string, number>;
  byPool: Record<string, number>;
  byPlatform: Record<string, number>;
  lastTimestamp: number;
}

export interface SwapAggregates {
  totalVolumeZec: number;
  totalFeesZec: number;
  swapCount: number;
  averageSwapZec: number;
}

export interface TransactionAggregates {
  totalVolumeZec: number;
  totalFeesZec: number;
  transactionCount: number;
  averageAmountZec: number;
}

export interface HealthStatus {
  status: "operational" | "degraded" | "offline";
  version: string;
  chainId: number;
  contractAddress: string;
  swapCount: number;
  transactionCount: number;
}
