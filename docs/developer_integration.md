# Zcash FHE Analytics - Developer Integration Guide

## Overview

This system enables **privacy-preserving analytics** for Zcash transactions using Fully Homomorphic Encryption (FHE). Wallets integrate our native SDKs to contribute encrypted transaction data that can be analyzed without revealing individual amounts.

## Key Privacy Guarantees

### What Gets Encrypted (Client-Side)
- Transaction amounts (CKKS FHE encrypted)
- Transaction fees (CKKS FHE encrypted)
- Swap amounts (CKKS FHE encrypted)

### What Stays Private
- User identities (never transmitted)
- Wallet addresses (never transmitted)
- Individual transaction values (never decrypted individually)

### What's Revealed
- Only aggregated statistics via 3-of-5 threshold decryption
- Examples: Total volume, average transaction size, fee totals

## Integration Methods

### Method 1: Kotlin SDK (Android)

```kotlin
// Add to your build.gradle
implementation("co.electriccoin.zcash:fhe-analytics-sdk:1.0.0")

// Initialize client
val client = FHEAnalyticsClient(httpClient, "https://your-analytics-server/api")
client.initialize()

// Submit swap metrics
val metrics = SwapMetrics(
    amountZecIn = "1.5",
    amountOut = "100.0",
    destinationAsset = "USDC",
    originAsset = "ZEC",
    affiliateFee = "0.001",
    timestamp = System.currentTimeMillis(),
    swapType = "exact_input",
    depositAddress = "deposit-address",
    provider = "crosspay",
    platform = "zashi-android"
)
client.submitSwapMetrics(metrics)

// Submit transaction metrics
val txMetrics = TransactionMetrics(
    amount = "0.5",
    fee = "0.0001",
    txType = "send",
    poolType = "orchard",
    platform = "zashi-android",
    timestamp = System.currentTimeMillis()
)
client.submitTransactionMetrics(txMetrics)
```

### Method 2: Swift SDK (iOS)

```swift
import FHEAnalytics

// Initialize client
let client = FHEAnalyticsClient(serverURL: "https://your-analytics-server/api")
try await client.initialize()

// Submit swap metrics
let metrics = SwapMetrics(
    amountZecIn: "1.5",
    amountOut: "100.0",
    destinationAsset: "USDC",
    originAsset: "ZEC",
    affiliateFee: "0.001",
    timestamp: Date().timeIntervalSince1970,
    swapType: "exact_input",
    depositAddress: "deposit-address",
    provider: "crosspay",
    platform: "zashi-ios"
)
try await client.submitSwapMetrics(metrics)
```

### Method 3: Direct API Integration

**Step 1: Get Public Key**
```bash
curl https://your-analytics-server/api/keys/fhe_public
```

Response:
```json
{
  "poly_degree": 1024,
  "scale": 1048576.0,
  "coeff_modulus": 1099511627689,
  "public_key": {
    "a": [...],
    "b": [...]
  },
  "algorithm": "CKKS-FHE"
}
```

**Step 2: Encrypt and Submit**
```bash
curl -X POST https://your-analytics-server/api/ingest/swap \
  -H "Content-Type: application/json" \
  -d '{
    "encrypted_amount_in": {"c0": [...], "c1": [...], "scale": 1048576.0},
    "encrypted_amount_out": {"c0": [...], "c1": [...], "scale": 1048576.0},
    "encrypted_fee": {"c0": [...], "c1": [...], "scale": 1048576.0},
    "destination_asset": "USDC",
    "origin_asset": "ZEC",
    "timestamp": 1700000000000,
    "platform": "custom-wallet",
    "swap_type": "exact_input",
    "deposit_address": "...",
    "provider": "crosspay"
  }'
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/keys/fhe_public` | GET | Get CKKS public key for client-side encryption |
| `/api/ingest/swap` | POST | Submit encrypted swap data |
| `/api/ingest/transaction` | POST | Submit encrypted transaction data |
| `/api/analytics/aggregate` | GET | Get threshold-decrypted swap aggregates |
| `/api/analytics/transactions` | GET | Get threshold-decrypted transaction aggregates |
| `/api/swaps/count` | GET | Get swap count and metadata breakdown |
| `/api/health` | GET | Health check and system status |

## Privacy Architecture

```
Wallet (Android/iOS)
    │
    ├─> CKKS Encrypt(amount) ────┐
    ├─> CKKS Encrypt(fee) ───────┤
    │                            │
    └─> Metadata only ───────────┘
                                 │
                                 ▼
                    Analytics Backend
                      │
                      ├─> Homomorphic Sum
                      │   (on encrypted data)
                      │
                      ▼
                 Threshold Network (3-of-5)
                      │
                      └─> Aggregated Totals Only
                          (Individual values impossible to reveal)
```

## CKKS Parameters

- **Polynomial Degree (N)**: 1024
- **Coefficient Modulus (q)**: ~40-bit prime
- **Scale**: 2^20 (1,048,576)
- **Security Level**: ~110 bits (Ring-LWE hardness)

## FAQ

**Q: Can the analytics server see individual amounts?**
A: No. All amounts are CKKS encrypted client-side. Only aggregated sums are revealed via 3-of-5 threshold decryption.

**Q: What data is NOT encrypted?**
A: Metadata like destination asset, platform name, and timestamps are not encrypted (they're needed for categorization).

**Q: How is this different from blockchain explorers?**
A: We receive encrypted data directly from wallets - not from the blockchain. This includes shielded transaction data that blockchain explorers cannot see.

## Support

- GitHub: https://github.com/collinsville22/zcash-fhe-analytics
- Issues: https://github.com/collinsville22/zcash-fhe-analytics/issues
