# FHE Analytics iOS SDK - Integration Guide

## Installation

### Swift Package Manager

Add the local package to your Xcode project:

1. File → Add Package Dependencies
2. Click "Add Local..."
3. Select the `zashi-sdk-ios` folder

Or in your `Package.swift`:

```swift
dependencies: [
    .package(path: "../zashi-sdk-ios")
]
```

### Manual Integration

1. Copy the `zashi-sdk-ios/Sources` folder to your project
2. Add the Swift files to your target

## Usage

### 1. Import the Module

```swift
import FHEAnalytics
```

### 2. Initialize the SDK

```swift
let fheAnalytics = FHEAnalyticsSDK(serverURL: "https://your-backend.com/api")

Task {
    do {
        try await fheAnalytics.fetchPublicKey()
    } catch {
        // Analytics initialization failed (non-critical)
    }
}
```

### 3. Submit Swap Metrics

When a swap quote is loaded or swap completes:

```swift
func submitSwapAnalytics(quote: SwapQuote) {
    Task {
        let metrics = SwapMetrics(
            amountZecIn: quote.amountIn.description,
            amountZecInFormatted: quote.amountIn.description,
            amountZecInUsd: quote.amountInUsd ?? "0",
            amountOut: quote.amountOut.description,
            amountOutFormatted: quote.amountOut.description,
            amountOutUsd: quote.amountOutUsd ?? "0",
            destinationAsset: quote.destinationAsset,
            originAsset: "ZEC",
            affiliateFee: quote.affiliateFee?.description ?? "0",
            affiliateFeeUsd: quote.affiliateFeeUsd ?? "0",
            exchangeRate: quote.exchangeRate?.description ?? "0",
            slippageTolerance: slippageTolerance.description,
            timestamp: Int64(Date().timeIntervalSince1970 * 1000),
            swapType: "exact_input",
            depositAddress: quote.depositAddress,
            provider: "crosspay",
            platform: "zashi-ios"
        )
        
        try? await fheAnalytics.submitSwapMetrics(metrics)
    }
}
```

## SwapMetrics Struct

The SDK expects the following data structure (all amounts as Strings):

```swift
public struct SwapMetrics {
    public let amountZecIn: String          // ZEC amount (encrypted)
    public let amountZecInFormatted: String // Display string
    public let amountZecInUsd: String       // USD value
    public let amountOut: String            // Output amount (encrypted)
    public let amountOutFormatted: String   // Display string
    public let amountOutUsd: String         // USD value
    public let destinationAsset: String     // e.g., "USDC", "BTC"
    public let originAsset: String          // e.g., "ZEC"
    public let affiliateFee: String         // Fee amount (encrypted)
    public let affiliateFeeUsd: String      // Fee in USD
    public let exchangeRate: String         // Exchange rate
    public let slippageTolerance: String    // Slippage as string
    public let timestamp: Int64             // Unix timestamp in ms
    public let swapType: String             // "exact_input" or "exact_output"
    public let depositAddress: String       // Deposit address
    public let provider: String             // e.g., "crosspay"
    public let platform: String             // "zashi-ios"
}
```

## TransactionMetrics Struct

For shielded transaction analytics:

```swift
public struct TransactionMetrics {
    public let amount: String      // Transaction amount (encrypted)
    public let fee: String         // Fee amount (encrypted)
    public let txType: String      // "send" or "receive"
    public let poolType: String?   // "orchard" or "sapling"
    public let platform: String    // "zashi-ios"
    public let timestamp: Int64    // Unix timestamp in ms
}
```

## What Gets Encrypted

The following fields are CKKS encrypted client-side before transmission:
- `amountZecIn` - ZEC input amount
- `amountOut` - Output amount
- `affiliateFee` - Fee amount
- `amount` (transactions) - Transaction amount
- `fee` (transactions) - Transaction fee

All other fields are sent as plaintext metadata for categorization.

## Privacy Guarantees

- Individual amounts are encrypted with CKKS homomorphic encryption
- Backend can only compute aggregates (sums, averages) on encrypted data
- Decryption requires 3-of-5 threshold nodes
- No individual transaction values are ever revealed

## Requirements

- iOS 16.0+
- Swift 5.7+
- Xcode 14.0+

## Repository

https://github.com/collinsville22/zcash-fhe-analytics
