import { config } from "../config/index.js";
import { BlockchainService } from "./blockchain.js";
import { zatoshiToZec } from "../utils/index.js";
import type { SwapAggregates, TransactionAggregates } from "../types/index.js";

export class CofheService {
  private blockchain: BlockchainService;

  constructor(blockchain: BlockchainService) {
    this.blockchain = blockchain;
  }

  async getOrCreatePermit(): Promise<{ publicKey: string }> {
    return { publicKey: "0x" };
  }

  async decryptSwapAggregates(_permit: { publicKey: string }): Promise<SwapAggregates> {
    const metadata = await this.blockchain.getSwapMetadata();
    const volumeHandle = await this.blockchain.getSwapVolumeHandle();
    const feesHandle = await this.blockchain.getSwapFeesHandle();

    return {
      totalVolumeZec: zatoshiToZec(BigInt(volumeHandle || 0)),
      totalFeesZec: zatoshiToZec(BigInt(feesHandle || 0)),
      swapCount: metadata.count,
      averageSwapZec: metadata.count > 0 ? zatoshiToZec(BigInt(volumeHandle || 0)) / metadata.count : 0,
    };
  }

  async decryptTransactionAggregates(_permit: { publicKey: string }): Promise<TransactionAggregates> {
    const metadata = await this.blockchain.getTransactionMetadata();
    const volumeHandle = await this.blockchain.getTransactionVolumeHandle();
    const feesHandle = await this.blockchain.getTransactionFeesHandle();

    return {
      totalVolumeZec: zatoshiToZec(BigInt(volumeHandle || 0)),
      totalFeesZec: zatoshiToZec(BigInt(feesHandle || 0)),
      transactionCount: metadata.count,
      averageAmountZec: metadata.count > 0 ? zatoshiToZec(BigInt(volumeHandle || 0)) / metadata.count : 0,
    };
  }

  getChainConfig() {
    return {
      chainId: config.chainId,
      coFheUrl: config.cofheUrl,
      verifierUrl: config.verifierUrl,
      thresholdNetworkUrl: config.thresholdNetworkUrl,
      contractAddress: config.contractAddress,
      supportedTypes: ["uint8", "uint16", "uint32", "uint64", "uint128"],
    };
  }
}
