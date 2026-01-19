import { describe, it, expect } from "vitest";
import {
  SwapIngestRequestSchema,
  TransactionIngestRequestSchema,
  DecryptRequestSchema,
} from "../src/types/index.js";

describe("SwapIngestRequestSchema", () => {
  const validSwap = {
    encryptedAmountIn: {
      ctHash: "0x1234",
      securityZone: 0,
      utype: 5,
      signature: "0xabcd",
    },
    encryptedFee: {
      ctHash: "0x5678",
      securityZone: 0,
      utype: 5,
      signature: "0xefgh",
    },
    destinationAsset: "BTC",
    platform: "zashi-android",
  };

  it("accepts valid swap request", () => {
    const result = SwapIngestRequestSchema.safeParse(validSwap);
    expect(result.success).toBe(true);
  });

  it("accepts swap with optional timestamp", () => {
    const result = SwapIngestRequestSchema.safeParse({
      ...validSwap,
      timestamp: 1704067200000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing encryptedAmountIn", () => {
    const { encryptedAmountIn, ...invalid } = validSwap;
    const result = SwapIngestRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects missing encryptedFee", () => {
    const { encryptedFee, ...invalid } = validSwap;
    const result = SwapIngestRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects empty destinationAsset", () => {
    const result = SwapIngestRequestSchema.safeParse({
      ...validSwap,
      destinationAsset: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty platform", () => {
    const result = SwapIngestRequestSchema.safeParse({
      ...validSwap,
      platform: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects destinationAsset longer than 32 characters", () => {
    const result = SwapIngestRequestSchema.safeParse({
      ...validSwap,
      destinationAsset: "a".repeat(33),
    });
    expect(result.success).toBe(false);
  });

  it("rejects platform longer than 32 characters", () => {
    const result = SwapIngestRequestSchema.safeParse({
      ...validSwap,
      platform: "a".repeat(33),
    });
    expect(result.success).toBe(false);
  });
});

describe("TransactionIngestRequestSchema", () => {
  const validTransaction = {
    encryptedAmount: {
      ctHash: "0x1234",
      securityZone: 0,
      utype: 5,
      signature: "0xabcd",
    },
    encryptedFee: {
      ctHash: "0x5678",
      securityZone: 0,
      utype: 5,
      signature: "0xefgh",
    },
    transactionType: "send",
    platform: "zashi-ios",
  };

  it("accepts valid transaction request", () => {
    const result = TransactionIngestRequestSchema.safeParse(validTransaction);
    expect(result.success).toBe(true);
  });

  it("accepts transaction with poolType", () => {
    const result = TransactionIngestRequestSchema.safeParse({
      ...validTransaction,
      poolType: "orchard",
    });
    expect(result.success).toBe(true);
  });

  it("accepts transaction with optional timestamp", () => {
    const result = TransactionIngestRequestSchema.safeParse({
      ...validTransaction,
      timestamp: 1704067200000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing encryptedAmount", () => {
    const { encryptedAmount, ...invalid } = validTransaction;
    const result = TransactionIngestRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects missing transactionType", () => {
    const { transactionType, ...invalid } = validTransaction;
    const result = TransactionIngestRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects empty transactionType", () => {
    const result = TransactionIngestRequestSchema.safeParse({
      ...validTransaction,
      transactionType: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects poolType longer than 32 characters", () => {
    const result = TransactionIngestRequestSchema.safeParse({
      ...validTransaction,
      poolType: "a".repeat(33),
    });
    expect(result.success).toBe(false);
  });
});

describe("DecryptRequestSchema", () => {
  it("accepts empty object", () => {
    const result = DecryptRequestSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts object with permitHash", () => {
    const result = DecryptRequestSchema.safeParse({
      permitHash: "0x1234567890abcdef",
    });
    expect(result.success).toBe(true);
  });
});
