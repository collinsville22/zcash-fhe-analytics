# Zashi Wallet Integration Analysis

## Overview

This document analyzes the integration of FHE analytics into the Zashi Android wallet, based on actual code review of the Zashi codebase.

---

## Integration Points Identified

### 1. SwapRepository.kt

**Location**: `ui-lib/src/main/java/co/electriccoin/zcash/ui/common/repository/SwapRepository.kt`

**Integration Point**: After swap quote creation (line ~341)

```kotlin
// Existing code
quote.update { SwapQuoteData.Success(quote = result) }

// Added FHE analytics hook
if (FHE_DEMO_MODE) {
    scope.launch(Dispatchers.IO) {
        try {
            val metrics = ZashiSwapMapper.toSwapMetrics(result, depositAddress)
            fheAnalyticsClient.submitSwapMetrics(metrics)
        } catch (_: Exception) {
            // Silent failure
        }
    }
}
```

### 2. Swap Status Monitoring

**Location**: `observeSwapStatus()` function

**Integration Point**: When swap completes successfully

```kotlin
if (result.status == SwapStatus.SUCCESS) {
    scope.launch(Dispatchers.IO) {
        try {
            val metrics = ZashiSwapMapper.toSwapMetrics(result.quote, depositAddress)
            fheAnalyticsClient.submitSwapMetrics(metrics)
        } catch (e: Exception) {
            // Silent failure
        }
    }
}
```

---

## Data Available from Zashi

### SwapQuote Data Structure

| Field | Type | Available |
|-------|------|-----------|
| `amountIn` | BigDecimal | Yes |
| `amountOut` | BigDecimal | Yes |
| `amountInUsd` | BigDecimal | Yes |
| `amountOutUsd` | BigDecimal | Yes |
| `affiliateFee` | BigDecimal | Yes |
| `destinationAsset` | SwapAsset | Yes |
| `originAsset` | SwapAsset | Yes |
| `timestamp` | Instant | Yes |
| `slippage` | BigDecimal | Yes |
| `zecExchangeRate` | BigDecimal | Yes |
| `depositAddress` | SwapAddress | Yes |
| `mode` | SwapMode | Yes |

### Transaction Data (Shielded)

| Field | Type | Available |
|-------|------|-----------|
| Transaction amount | Zatoshi | Yes |
| Transaction fee | Zatoshi | Yes |
| Pool type | Orchard/Sapling | Yes |
| Transaction type | Send/Receive | Yes |
| Timestamp | Long | Yes |

---

## Metrics Computable

### High Confidence (Directly Available)

1. **Total Swap Volume** - Sum of `amountIn` across all swaps
2. **Total Fees** - Sum of `affiliateFee`
3. **Average Swap Size** - Mean of `amountIn`
4. **Destination Asset Breakdown** - Group by `destinationAsset.tokenTicker`
5. **Platform Distribution** - Group by platform
6. **Transaction Volume** - Sum of shielded transaction amounts
7. **Pool Usage** - Breakdown of Orchard vs Sapling

### Medium Confidence (Derivable)

8. **Swap Success Rate** - SUCCESS / total swaps
9. **Average Exchange Rate** - Mean of `zecExchangeRate`
10. **Fee Percentage** - affiliateFee / amountIn

### Not Available (Privacy Protected)

- Individual user activity
- Wallet addresses
- Transaction counterparties
- User retention metrics

---

## Implementation Status

### Completed
- [x] Kotlin SDK (`zashi-sdk-kotlin/`)
- [x] Swift SDK (`zashi-sdk-ios/`)
- [x] Backend API endpoints
- [x] CKKS encryption implementation
- [x] Threshold decryption (3-of-5)
- [x] Analytics dashboard
- [x] Ethereum oracle integration

### Integration Example (Working)

The Zashi Android integration has been demonstrated working:
1. SDK integrated into Zashi testnet build
2. Swap metrics encrypted client-side
3. Data submitted to analytics backend
4. Aggregates displayed on dashboard

**Demo Video**: https://youtu.be/GNCn2bxpa40

---

## Technical Requirements

### For Wallet Integration

**Dependencies**:
- Ktor HTTP client (already in Zashi)
- Kotlinx serialization (already in Zashi)
- Our FHE SDK (~50KB)

**Code Changes**:
- ~20 lines in SwapRepository.kt
- SDK initialization in Application class

**Performance Impact**:
- Encryption: ~30ms per transaction (background thread)
- Network: ~2KB per submission
- No impact on UI thread

---

## Privacy Compliance

### What's Transmitted (Encrypted)
- Transaction/swap amounts (CKKS ciphertext)
- Fees (CKKS ciphertext)

### What's Transmitted (Plaintext Metadata)
- Destination asset ticker (e.g., "USDC")
- Platform identifier (e.g., "zashi-android")
- Timestamps
- Swap type (exact_input/exact_output)

### What's Never Transmitted
- Wallet addresses
- User identifiers
- IP addresses (not logged by backend)
- Transaction hashes
- Counterparty information

---

## Conclusion

The FHE analytics integration with Zashi is:

1. **Technically Feasible** - Code structure supports clean integration
2. **Minimal Invasive** - ~20 lines of changes needed
3. **Privacy Preserving** - Amounts encrypted, only aggregates revealed
4. **Production Ready** - Working demo with real Zashi wallet

**Repository**: https://github.com/collinsville22/zcash-fhe-analytics
