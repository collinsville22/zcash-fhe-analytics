import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const ConfigSchema = z.object({
  port: z.coerce.number().default(5000),
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),
  chainId: z.coerce.number().default(11155111),
  contractAddress: z.string().startsWith("0x"),
  rpcUrl: z.string().url(),
  privateKey: z.string().min(64),
  cofheUrl: z.string().url().default("https://testnet-cofhe.fhenix.zone"),
  verifierUrl: z.string().url().default("https://testnet-cofhe-vrf.fhenix.zone"),
  thresholdNetworkUrl: z.string().url().default("https://testnet-cofhe-tn.fhenix.zone"),
  corsOrigins: z.string().default("*"),
  rateLimitWindowMs: z.coerce.number().default(60000),
  rateLimitMaxRequests: z.coerce.number().default(100),
});

const configResult = ConfigSchema.safeParse({
  port: process.env.PORT,
  nodeEnv: process.env.NODE_ENV,
  chainId: process.env.CHAIN_ID,
  contractAddress: process.env.CONTRACT_ADDRESS,
  rpcUrl: process.env.RPC_URL,
  privateKey: process.env.PRIVATE_KEY,
  cofheUrl: process.env.COFHE_URL,
  verifierUrl: process.env.VERIFIER_URL,
  thresholdNetworkUrl: process.env.THRESHOLD_NETWORK_URL,
  corsOrigins: process.env.CORS_ORIGINS,
  rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS,
  rateLimitMaxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
});

if (!configResult.success) {
  console.error("Configuration validation failed:");
  console.error(configResult.error.format());
  process.exit(1);
}

export const config = configResult.data;
export type Config = z.infer<typeof ConfigSchema>;
