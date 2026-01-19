export interface ChainConfig {
  chainId: number;
  coFheUrl: string;
  verifierUrl: string;
  thresholdNetworkUrl: string;
  contractAddress: string;
  supportedTypes: string[];
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

export interface CombinedAnalytics {
  swaps: SwapAggregates & {
    byDestination: Record<string, number>;
    byPlatform: Record<string, number>;
  };
  transactions: TransactionAggregates & {
    byType: Record<string, number>;
    byPool: Record<string, number>;
    byPlatform: Record<string, number>;
  };
}

export interface HealthStatus {
  status: "operational" | "degraded" | "offline";
  version: string;
  chainId: number;
  contractAddress: string;
  swapCount: number;
  transactionCount: number;
  timestamp: number;
}
