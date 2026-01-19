import { describe, it, expect } from "vitest";
import {
  zecToZatoshi,
  zatoshiToZec,
  stringToBytes32,
  bytes32ToString,
  normalizeAddress,
  retry,
} from "../src/utils/index.js";

describe("zecToZatoshi", () => {
  it("converts 1 ZEC to 100000000 zatoshi", () => {
    expect(zecToZatoshi(1)).toBe(100000000n);
  });

  it("converts 0.5 ZEC to 50000000 zatoshi", () => {
    expect(zecToZatoshi(0.5)).toBe(50000000n);
  });

  it("converts 0 ZEC to 0 zatoshi", () => {
    expect(zecToZatoshi(0)).toBe(0n);
  });

  it("converts fractional ZEC correctly", () => {
    expect(zecToZatoshi(0.00000001)).toBe(1n);
  });

  it("converts large amounts correctly", () => {
    expect(zecToZatoshi(21000000)).toBe(2100000000000000n);
  });
});

describe("zatoshiToZec", () => {
  it("converts 100000000 zatoshi to 1 ZEC", () => {
    expect(zatoshiToZec(100000000n)).toBe(1);
  });

  it("converts 50000000 zatoshi to 0.5 ZEC", () => {
    expect(zatoshiToZec(50000000n)).toBe(0.5);
  });

  it("converts 0 zatoshi to 0 ZEC", () => {
    expect(zatoshiToZec(0n)).toBe(0);
  });

  it("converts 1 zatoshi to 0.00000001 ZEC", () => {
    expect(zatoshiToZec(1n)).toBe(0.00000001);
  });
});

describe("stringToBytes32", () => {
  it("encodes short string", () => {
    const result = stringToBytes32("BTC");
    expect(result).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it("encodes empty string", () => {
    const result = stringToBytes32("");
    expect(result).toBe("0x0000000000000000000000000000000000000000000000000000000000000000");
  });

  it("truncates strings longer than 31 characters", () => {
    const longString = "a".repeat(50);
    const result = stringToBytes32(longString);
    expect(result).toMatch(/^0x[a-f0-9]{64}$/);
  });
});

describe("bytes32ToString", () => {
  it("decodes bytes32 to string", () => {
    const encoded = stringToBytes32("BTC");
    const decoded = bytes32ToString(encoded);
    expect(decoded).toBe("BTC");
  });

  it("returns empty string for zero bytes", () => {
    const zeros = "0x0000000000000000000000000000000000000000000000000000000000000000";
    expect(bytes32ToString(zeros)).toBe("");
  });

  it("handles roundtrip conversion", () => {
    const original = "zashi-android";
    const encoded = stringToBytes32(original);
    const decoded = bytes32ToString(encoded);
    expect(decoded).toBe(original);
  });
});

describe("normalizeAddress", () => {
  it("lowercases address", () => {
    const address = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12";
    expect(normalizeAddress(address)).toBe(address.toLowerCase());
  });

  it("preserves already lowercase address", () => {
    const address = "0xabcdef1234567890abcdef1234567890abcdef12";
    expect(normalizeAddress(address)).toBe(address);
  });
});

describe("retry", () => {
  it("returns result on first success", async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      return "success";
    };

    const result = await retry(fn, 3, 10);
    expect(result).toBe("success");
    expect(attempts).toBe(1);
  });

  it("retries on failure and returns success", async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error("fail");
      }
      return "success";
    };

    const result = await retry(fn, 3, 10);
    expect(result).toBe("success");
    expect(attempts).toBe(3);
  });

  it("throws after max attempts", async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      throw new Error("always fails");
    };

    await expect(retry(fn, 3, 10)).rejects.toThrow("always fails");
    expect(attempts).toBe(3);
  });
});
