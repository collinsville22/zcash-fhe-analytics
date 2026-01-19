import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { REFRESH_INTERVAL } from "@/config";

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: api.getHealth,
    refetchInterval: REFRESH_INTERVAL,
    staleTime: 5000,
  });
}

export function useChainConfig() {
  return useQuery({
    queryKey: ["chainConfig"],
    queryFn: api.getChainConfig,
    staleTime: Infinity,
  });
}

export function useSwapMetadata() {
  return useQuery({
    queryKey: ["swapMetadata"],
    queryFn: api.getSwapMetadata,
    refetchInterval: REFRESH_INTERVAL,
    staleTime: 5000,
  });
}

export function useTransactionMetadata() {
  return useQuery({
    queryKey: ["transactionMetadata"],
    queryFn: api.getTransactionMetadata,
    refetchInterval: REFRESH_INTERVAL,
    staleTime: 5000,
  });
}

export function useCombinedAnalytics() {
  return useQuery({
    queryKey: ["combinedAnalytics"],
    queryFn: api.getCombinedAnalytics,
    refetchInterval: REFRESH_INTERVAL,
    staleTime: 5000,
  });
}
