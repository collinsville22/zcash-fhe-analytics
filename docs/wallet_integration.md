# Wallet Integration Guide
## Integrating FHE Analytics into Zcash Wallets

---

## Overview

This guide explains how to integrate privacy-preserving FHE analytics into Zcash wallets. The integration is designed to be minimal and non-invasive.

---

## Architecture

### Data Flow
```
Wallet App
    │
    ├─> User initiates transaction/swap
    │
    ├─> Normal Zcash flow (unchanged)
    │   └─> zk-SNARK → Blockchain
    │
    └─> Analytics flow (new, optional)
        ├─> CKKS encrypt amounts locally
        └─> Submit to analytics backend
```

### Privacy Guarantee
- Wallet encrypts amounts **before** sending
- Backend never sees plaintext amounts
- Only aggregates are decrypted (via threshold)

---

## Integration for Android (Kotlin)

### Step 1: Add SDK Dependency

The SDK is available in the `zashi-sdk-kotlin` directory. Copy the relevant files:
- `FHEAnalyticsClient.kt`
- `Polynomial.kt`

### Step 2: Initialize Client

```kotlin
class YourWalletApplication : Application() {
    lateinit var fheAnalytics: FHEAnalyticsClient
    
    override fun onCreate() {
        super.onCreate()
        
        val httpClient = HttpClient(CIO) {
            install(ContentNegotiation) {
                json()
            }
        }
        
        fheAnalytics = FHEAnalyticsClient(
            httpClient = httpClient,
            serverURL = "https://your-analytics-server/api"
        )
        
        // Initialize in background
        lifecycleScope.launch {
            try {
                fheAnalytics.initialize()
            } catch (e: Exception) {
                // Handle initialization failure (analytics optional)
            }
        }
    }
}
```

### Step 3: Hook into Swap Flow

In your swap repository (e.g., after successful quote):

```kotlin
// After swap quote is created
quote.update { SwapQuoteData.Success(quote = result) }

// Add analytics (fire-and-forget, don't block UI)
scope.launch(Dispatchers.IO) {
    try {
        val metrics = SwapMetrics(
            amountZecIn = result.amountIn.toString(),
            amountOut = result.amountOut.toString(),
            destinationAsset = result.destinationAsset.tokenTicker,
            originAsset = result.originAsset.tokenTicker,
            affiliateFee = result.affiliateFee.toString(),
            timestamp = System.currentTimeMillis(),
            swapType = result.mode.name.lowercase(),
            depositAddress = result.depositAddress.address,
            provider = "crosspay",
            platform = "zashi-android"
        )
        fheAnalytics.submitSwapMetrics(metrics)
    } catch (e: Exception) {
        // Silent failure - analytics should never break wallet
    }
}
```

### Step 4: Hook into Transaction Flow

```kotlin
// After shielded transaction is broadcast
scope.launch(Dispatchers.IO) {
    try {
        val metrics = TransactionMetrics(
            amount = transaction.amount.toString(),
            fee = transaction.fee.toString(),
            txType = if (transaction.isSend) "send" else "receive",
            poolType = transaction.pool.name.lowercase(), // "orchard" or "sapling"
            platform = "zashi-android",
            timestamp = System.currentTimeMillis()
        )
        fheAnalytics.submitTransactionMetrics(metrics)
    } catch (e: Exception) {
        // Silent failure
    }
}
```

---

## Integration for iOS (Swift)

### Step 1: Add SDK

Add the Swift package from `zashi-sdk-ios`:

```swift
// Package.swift
dependencies: [
    .package(path: "../zashi-sdk-ios")
]
```

### Step 2: Initialize Client

```swift
class AnalyticsManager {
    static let shared = AnalyticsManager()
    private var client: FHEAnalyticsClient?
    
    func initialize() async {
        client = FHEAnalyticsClient(serverURL: "https://your-analytics-server/api")
        do {
            try await client?.initialize()
        } catch {
            // Analytics initialization failed (non-critical)
        }
    }
    
    func submitSwap(_ swap: SwapQuote) {
        Task {
            guard let client = client else { return }
            let metrics = SwapMetrics(
                amountZecIn: swap.amountIn.description,
                amountOut: swap.amountOut.description,
                destinationAsset: swap.destinationAsset.ticker,
                // ... other fields
            )
            try? await client.submitSwapMetrics(metrics)
        }
    }
}
```

---

## Best Practices

### Do's
- Initialize SDK on app startup (background thread)
- Use fire-and-forget pattern (don't await analytics)
- Catch all exceptions (analytics should never crash wallet)
- Use accurate timestamps

### Don'ts
- Don't block UI on analytics calls
- Don't retry failed submissions aggressively
- Don't log sensitive data
- Don't make analytics required for wallet operation

---

## Integration Effort

| Task | Time Estimate |
|------|---------------|
| Add SDK files | 5 minutes |
| Initialize client | 15 minutes |
| Hook swap flow | 30 minutes |
| Hook transaction flow | 30 minutes |
| Testing | 1 hour |
| **Total** | **~2.5 hours** |

---

## Testing

### Local Testing
1. Run backend locally: `cd backend && python app.py`
2. Point SDK to `http://10.0.2.2:5000/api` (Android emulator)
3. Trigger swaps/transactions
4. Check dashboard at `http://localhost:5000`

### Verify Privacy
- Use network inspector to confirm only encrypted data is sent
- Check that `c0` and `c1` arrays are transmitted (ciphertext)
- Verify no plaintext amounts in network traffic

---

## Support

- Repository: https://github.com/collinsville22/zcash-fhe-analytics
- Issues: https://github.com/collinsville22/zcash-fhe-analytics/issues
