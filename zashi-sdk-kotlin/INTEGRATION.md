# FHE Analytics Android SDK - Integration Guide

## Installation

### Add Module to Project

1. Copy `zashi-sdk-kotlin` folder to your project
2. Add the `FHEAnalyticsSDK.kt` file to your project's source

### Dependencies

Add to your `build.gradle`:

```kotlin
dependencies {
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.json:json:20231013")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")
}
```

## Usage

### 1. Initialize the SDK

```kotlin
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

// Create SDK instance
val fheAnalytics = FHEAnalyticsSDK(serverURL = "https://your-backend.com/api")

// Fetch public key (required before submitting metrics)
suspend fun initializeAnalytics() {
    withContext(Dispatchers.IO) {
        try {
            fheAnalytics.fetchPublicKey()
        } catch (e: Exception) {
            // Handle initialization failure (analytics is optional)
        }
    }
}
```

### 2. Submit Swap Metrics

When a swap completes successfully:

```kotlin
suspend fun submitSwapAnalytics(result: SwapQuote) {
    withContext(Dispatchers.IO) {
        try {
            val metrics = SwapMetrics(
                amountZecIn = result.amountIn.toDouble(),
                amountZecInFormatted = result.amountIn.toString(),
                amountZecInUsd = result.amountInUsd?.toString() ?: "0",
                amountOut = result.amountOut.toDouble(),
                amountOutFormatted = result.amountOut.toString(),
                amountOutUsd = result.amountOutUsd?.toString() ?: "0",
                destinationAsset = result.destinationAsset.tokenTicker,
                originAsset = "ZEC",
                affiliateFee = result.affiliateFee?.toDouble() ?: 0.0,
                affiliateFeeUsd = result.affiliateFeeUsd?.toString() ?: "0",
                exchangeRate = result.exchangeRate?.toDouble() ?: 0.0,
                slippageTolerance = result.slippage?.toDouble() ?: 0.0,
                timestamp = System.currentTimeMillis(),
                swapType = result.mode?.name?.lowercase() ?: "exact_input",
                depositAddress = result.depositAddress?.address ?: "",
                provider = "crosspay",
                platform = "zashi-android"
            )

            fheAnalytics.submitSwapMetrics(metrics)
        } catch (e: Exception) {
            // Silent failure - analytics should never break wallet
        }
    }
}
```

## SwapMetrics Data Class

The SDK expects the following data structure:

```kotlin
data class SwapMetrics(
    val amountZecIn: Double,           // ZEC amount as Double (encrypted)
    val amountZecInFormatted: String,  // Display string
    val amountZecInUsd: String,        // USD value string
    val amountOut: Double,             // Output amount as Double (encrypted)
    val amountOutFormatted: String,    // Display string
    val amountOutUsd: String,          // USD value string
    val destinationAsset: String,      // e.g., "USDC", "BTC"
    val originAsset: String,           // e.g., "ZEC"
    val affiliateFee: Double,          // Fee amount (encrypted)
    val affiliateFeeUsd: String,       // Fee in USD
    val exchangeRate: Double,          // Exchange rate
    val slippageTolerance: Double,     // Slippage as decimal
    val timestamp: Long,               // Unix timestamp in ms
    val swapType: String,              // "exact_input" or "exact_output"
    val depositAddress: String,        // Deposit address
    val provider: String,              // e.g., "crosspay"
    val platform: String               // "zashi-android"
)
```

## What Gets Encrypted

The following fields are CKKS encrypted client-side before transmission:
- `amountZecIn` - ZEC input amount
- `amountOut` - Output amount
- `affiliateFee` - Fee amount

All other fields are sent as plaintext metadata for categorization.

## Privacy Guarantees

- Individual amounts are encrypted with CKKS homomorphic encryption
- Backend can only compute aggregates (sums, averages) on encrypted data
- Decryption requires 3-of-5 threshold nodes
- No individual transaction values are ever revealed

## Requirements

- Android SDK 24+
- Kotlin 1.8+
- OkHttp 4.x
- Kotlinx Coroutines

## Repository

https://github.com/collinsville22/zcash-fhe-analytics
