import { encodeBytes32String, decodeBytes32String } from "ethers";

const ZATOSHI_DECIMALS = 8;
const ZATOSHI_MULTIPLIER = BigInt(10 ** ZATOSHI_DECIMALS);

export function zecToZatoshi(zec: number): bigint {
  return BigInt(Math.floor(zec * Number(ZATOSHI_MULTIPLIER)));
}

export function zatoshiToZec(zatoshi: bigint): number {
  return Number(zatoshi) / Number(ZATOSHI_MULTIPLIER);
}

export function stringToBytes32(str: string): string {
  if (str.length > 31) {
    str = str.slice(0, 31);
  }
  return encodeBytes32String(str);
}

export function bytes32ToString(bytes32: string): string {
  try {
    return decodeBytes32String(bytes32);
  } catch {
    return "";
  }
}

export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await fn();
        resolve(result);
        return;
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxAttempts) {
          await sleep(delayMs * attempt);
        }
      }
    }

    reject(lastError);
  });
}
