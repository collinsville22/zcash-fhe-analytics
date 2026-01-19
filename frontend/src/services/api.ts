import { API_BASE_URL } from "@/config";
import type {
  ChainConfig,
  SwapMetadata,
  TransactionMetadata,
  CombinedAnalytics,
  HealthStatus,
} from "@/types";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  getHealth: () => request<HealthStatus>("/health"),

  getChainConfig: () => request<ChainConfig>("/keys/config"),

  getSwapMetadata: () => request<SwapMetadata>("/analytics/swaps"),

  getTransactionMetadata: () => request<TransactionMetadata>("/analytics/transactions"),

  getCombinedAnalytics: () => request<CombinedAnalytics>("/analytics/combined"),

  ingestSwap: (data: {
    encryptedAmountIn: { ctHash: string; securityZone: number; utype: number; signature: string };
    encryptedFee: { ctHash: string; securityZone: number; utype: number; signature: string };
    destinationAsset: string;
    platform: string;
  }) => request<{ status: string; transactionHash: string }>("/ingest/swap", {
    method: "POST",
    body: JSON.stringify(data),
  }),

  ingestTransaction: (data: {
    encryptedAmount: { ctHash: string; securityZone: number; utype: number; signature: string };
    encryptedFee: { ctHash: string; securityZone: number; utype: number; signature: string };
    transactionType: string;
    poolType?: string;
    platform: string;
  }) => request<{ status: string; transactionHash: string }>("/ingest/transaction", {
    method: "POST",
    body: JSON.stringify(data),
  }),
};
