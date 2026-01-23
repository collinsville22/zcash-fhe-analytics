import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Address,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia, arbitrumSepolia } from "viem/chains";
import { config } from "../config/index.js";
import { stringToBytes32, bytes32ToString } from "../utils/index.js";
import type { EncryptedInput, SwapMetadata, TransactionMetadata } from "../types/index.js";

const CHAIN_MAP = {
  11155111: sepolia,
  421614: arbitrumSepolia,
} as const;

const CONTRACT_ABI = [
  {
    inputs: [
      { name: "encryptedAmountIn", type: "tuple", components: [
        { name: "ctHash", type: "uint256" },
        { name: "securityZone", type: "uint8" },
        { name: "utype", type: "uint8" },
        { name: "signature", type: "bytes" }
      ]},
      { name: "encryptedFee", type: "tuple", components: [
        { name: "ctHash", type: "uint256" },
        { name: "securityZone", type: "uint8" },
        { name: "utype", type: "uint8" },
        { name: "signature", type: "bytes" }
      ]},
      { name: "destinationAsset", type: "bytes32" },
      { name: "platform", type: "bytes32" },
    ],
    name: "ingestSwap",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "encryptedAmount", type: "tuple", components: [
        { name: "ctHash", type: "uint256" },
        { name: "securityZone", type: "uint8" },
        { name: "utype", type: "uint8" },
        { name: "signature", type: "bytes" }
      ]},
      { name: "encryptedFee", type: "tuple", components: [
        { name: "ctHash", type: "uint256" },
        { name: "securityZone", type: "uint8" },
        { name: "utype", type: "uint8" },
        { name: "signature", type: "bytes" }
      ]},
      { name: "transactionType", type: "bytes32" },
      { name: "poolType", type: "bytes32" },
      { name: "platform", type: "bytes32" },
    ],
    name: "ingestTransaction",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getSwapVolumeHandle",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getSwapFeesHandle",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTransactionVolumeHandle",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTransactionFeesHandle",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getSwapCount",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTransactionCount",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "destination", type: "bytes32" }],
    name: "getSwapsByDestination",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "platform", type: "bytes32" }],
    name: "getSwapsByPlatform",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "txType", type: "bytes32" }],
    name: "getTransactionsByType",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "pool", type: "bytes32" }],
    name: "getTransactionsByPool",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "platform", type: "bytes32" }],
    name: "getTransactionsByPlatform",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getDestinationAssets",
    outputs: [{ type: "bytes32[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getPlatforms",
    outputs: [{ type: "bytes32[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTransactionTypes",
    outputs: [{ type: "bytes32[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getPoolTypes",
    outputs: [{ type: "bytes32[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getLastSwapTimestamp",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getLastTransactionTimestamp",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export class BlockchainService {
  private publicClient: PublicClient;
  private walletClient: WalletClient;
  private contractAddress: Address;
  private chain: typeof sepolia | typeof arbitrumSepolia;
  private account: ReturnType<typeof privateKeyToAccount>;

  constructor() {
    const chain = CHAIN_MAP[config.chainId as keyof typeof CHAIN_MAP];
    if (!chain) {
      throw new Error(`Unsupported chain ID: ${config.chainId}`);
    }

    this.chain = chain;
    this.account = privateKeyToAccount(`0x${config.privateKey}` as `0x${string}`);

    this.publicClient = createPublicClient({
      chain,
      transport: http(config.rpcUrl),
    });

    this.walletClient = createWalletClient({
      account: this.account,
      chain,
      transport: http(config.rpcUrl),
    });

    this.contractAddress = config.contractAddress as Address;
  }

  getPublicClient(): PublicClient {
    return this.publicClient;
  }

  getWalletClient(): WalletClient {
    return this.walletClient;
  }

  async ingestSwap(
    encryptedAmountIn: EncryptedInput,
    encryptedFee: EncryptedInput,
    destinationAsset: string,
    platform: string
  ): Promise<Hash> {
    const hash = await this.walletClient.writeContract({
      account: this.account,
      chain: this.chain,
      address: this.contractAddress,
      abi: CONTRACT_ABI,
      functionName: "ingestSwap",
      args: [
        {
          ctHash: BigInt(encryptedAmountIn.ctHash),
          securityZone: encryptedAmountIn.securityZone,
          utype: encryptedAmountIn.utype,
          signature: encryptedAmountIn.signature as `0x${string}`,
        },
        {
          ctHash: BigInt(encryptedFee.ctHash),
          securityZone: encryptedFee.securityZone,
          utype: encryptedFee.utype,
          signature: encryptedFee.signature as `0x${string}`,
        },
        stringToBytes32(destinationAsset) as `0x${string}`,
        stringToBytes32(platform) as `0x${string}`,
      ],
    });

    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async ingestTransaction(
    encryptedAmount: EncryptedInput,
    encryptedFee: EncryptedInput,
    transactionType: string,
    poolType: string,
    platform: string
  ): Promise<Hash> {
    const hash = await this.walletClient.writeContract({
      account: this.account,
      chain: this.chain,
      address: this.contractAddress,
      abi: CONTRACT_ABI,
      functionName: "ingestTransaction",
      args: [
        {
          ctHash: BigInt(encryptedAmount.ctHash),
          securityZone: encryptedAmount.securityZone,
          utype: encryptedAmount.utype,
          signature: encryptedAmount.signature as `0x${string}`,
        },
        {
          ctHash: BigInt(encryptedFee.ctHash),
          securityZone: encryptedFee.securityZone,
          utype: encryptedFee.utype,
          signature: encryptedFee.signature as `0x${string}`,
        },
        stringToBytes32(transactionType) as `0x${string}`,
        stringToBytes32(poolType || "") as `0x${string}`,
        stringToBytes32(platform) as `0x${string}`,
      ],
    });

    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async getSwapVolumeHandle(): Promise<bigint> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: CONTRACT_ABI,
      functionName: "getSwapVolumeHandle",
    });
    return result as bigint;
  }

  async getSwapFeesHandle(): Promise<bigint> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: CONTRACT_ABI,
      functionName: "getSwapFeesHandle",
    });
    return result as bigint;
  }

  async getTransactionVolumeHandle(): Promise<bigint> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: CONTRACT_ABI,
      functionName: "getTransactionVolumeHandle",
    });
    return result as bigint;
  }

  async getTransactionFeesHandle(): Promise<bigint> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: CONTRACT_ABI,
      functionName: "getTransactionFeesHandle",
    });
    return result as bigint;
  }

  async getSwapMetadata(): Promise<SwapMetadata> {
    const [count, destinations, platforms, lastTimestamp] = await Promise.all([
      this.publicClient.readContract({
        address: this.contractAddress,
        abi: CONTRACT_ABI,
        functionName: "getSwapCount",
      }),
      this.publicClient.readContract({
        address: this.contractAddress,
        abi: CONTRACT_ABI,
        functionName: "getDestinationAssets",
      }),
      this.publicClient.readContract({
        address: this.contractAddress,
        abi: CONTRACT_ABI,
        functionName: "getPlatforms",
      }),
      this.publicClient.readContract({
        address: this.contractAddress,
        abi: CONTRACT_ABI,
        functionName: "getLastSwapTimestamp",
      }),
    ]);

    const byDestination: Record<string, number> = {};
    for (const dest of destinations as string[]) {
      const destCount = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: CONTRACT_ABI,
        functionName: "getSwapsByDestination",
        args: [dest as `0x${string}`],
      });
      byDestination[bytes32ToString(dest)] = Number(destCount);
    }

    const byPlatform: Record<string, number> = {};
    for (const plat of platforms as string[]) {
      const platCount = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: CONTRACT_ABI,
        functionName: "getSwapsByPlatform",
        args: [plat as `0x${string}`],
      });
      byPlatform[bytes32ToString(plat)] = Number(platCount);
    }

    return {
      count: Number(count),
      byDestination,
      byPlatform,
      lastTimestamp: Number(lastTimestamp),
    };
  }

  async getTransactionMetadata(): Promise<TransactionMetadata> {
    const [count, types, pools, platforms, lastTimestamp] = await Promise.all([
      this.publicClient.readContract({
        address: this.contractAddress,
        abi: CONTRACT_ABI,
        functionName: "getTransactionCount",
      }),
      this.publicClient.readContract({
        address: this.contractAddress,
        abi: CONTRACT_ABI,
        functionName: "getTransactionTypes",
      }),
      this.publicClient.readContract({
        address: this.contractAddress,
        abi: CONTRACT_ABI,
        functionName: "getPoolTypes",
      }),
      this.publicClient.readContract({
        address: this.contractAddress,
        abi: CONTRACT_ABI,
        functionName: "getPlatforms",
      }),
      this.publicClient.readContract({
        address: this.contractAddress,
        abi: CONTRACT_ABI,
        functionName: "getLastTransactionTimestamp",
      }),
    ]);

    const byType: Record<string, number> = {};
    for (const t of types as string[]) {
      const typeCount = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: CONTRACT_ABI,
        functionName: "getTransactionsByType",
        args: [t as `0x${string}`],
      });
      byType[bytes32ToString(t)] = Number(typeCount);
    }

    const byPool: Record<string, number> = {};
    for (const p of pools as string[]) {
      const poolCount = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: CONTRACT_ABI,
        functionName: "getTransactionsByPool",
        args: [p as `0x${string}`],
      });
      byPool[bytes32ToString(p)] = Number(poolCount);
    }

    const byPlatform: Record<string, number> = {};
    for (const plat of platforms as string[]) {
      const platCount = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: CONTRACT_ABI,
        functionName: "getTransactionsByPlatform",
        args: [plat as `0x${string}`],
      });
      byPlatform[bytes32ToString(plat)] = Number(platCount);
    }

    return {
      count: Number(count),
      byType,
      byPool,
      byPlatform,
      lastTimestamp: Number(lastTimestamp),
    };
  }
}
