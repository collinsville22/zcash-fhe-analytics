# Zcash FHE Analytics

Privacy-preserving analytics for Zcash using Fully Homomorphic Encryption (FHE) with CKKS scheme and threshold decryption.

## Demo Video

[![Zcash FHE Analytics Demo](https://img.youtube.com/vi/GNCn2bxpa40/maxresdefault.jpg)](https://youtu.be/GNCn2bxpa40?si=dSlHgajSLfrVtQuc)

**[Watch the full demo on YouTube](https://youtu.be/GNCn2bxpa40?si=dSlHgajSLfrVtQuc)**

## Overview

This project implements a privacy-preserving analytics system for Zcash transactions using:

- **CKKS Homomorphic Encryption**: Transaction amounts are encrypted client-side and never decrypted individually
- **Threshold Decryption (3-of-5)**: Only aggregate statistics can be decrypted, requiring consensus from multiple nodes
- **Ethereum Oracle**: Aggregate metrics are published on-chain for transparency
- **Native SDKs**: Kotlin (Android) and Swift (iOS) implementations for Zashi wallet integration

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Zashi Wallet  │────▶│  FHE Analytics   │────▶│   Dashboard     │
│  (Android/iOS)  │     │     Backend      │     │   (Frontend)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                       │                        │
        │                       ▼                        │
        │              ┌──────────────────┐              │
        │              │ Threshold Nodes  │              │
        │              │   (3-of-5 DKG)   │              │
        │              └──────────────────┘              │
        │                       │                        │
        │                       ▼                        │
        │              ┌──────────────────┐              │
        └─────────────▶│ Ethereum Oracle  │◀─────────────┘
                       │    (Sepolia)     │
                       └──────────────────┘
```

## Key Features

### Privacy Guarantees
- Individual transaction amounts are **never revealed**
- Only aggregate statistics (total volume, average, count) are decrypted
- Threshold cryptography ensures no single party can decrypt individual data
- Client-side encryption using CKKS scheme with ~110-bit security

### Analytics Capabilities
- **CrossPay Swap Analytics**: Track swap volumes, fees, and destination assets
- **Shielded Transaction Analytics**: Monitor Orchard/Sapling pool usage
- **Real-time Dashboard**: Live metrics with automatic refresh
- **On-chain Verification**: Aggregates published to Ethereum for transparency

## Project Structure

```
zcash-fhe-analytics/
├── backend/                 # Python Flask API
│   ├── app.py              # Main API endpoints
│   ├── fhe_core/           # FHE implementation (CKKS, NTT, etc.)
│   │   ├── ckks.py         # CKKS encryption scheme
│   │   ├── polynomial.py   # Polynomial arithmetic
│   │   └── ntt.py          # Number Theoretic Transform
│   └── threshold/          # Threshold cryptography
│       ├── dkg.py          # Distributed Key Generation
│       └── shamir.py       # Shamir Secret Sharing
├── frontend/               # Analytics dashboard
│   ├── index.html          # Dashboard UI
│   └── app.js              # Dashboard logic
├── ethereum-oracle/        # Smart contract for on-chain metrics
│   ├── contracts/          # Solidity contracts
│   └── scripts/            # Deployment scripts
├── zashi-sdk-kotlin/       # Android SDK
│   └── FHEAnalyticsSDK.kt  # Kotlin CKKS implementation
├── zashi-sdk-ios/          # iOS SDK
│   └── Sources/            # Swift CKKS implementation
└── docs/                   # Documentation
```

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+ (for Ethereum oracle)

### Backend Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Run the backend
cd backend
python app.py
```

The server starts at `http://localhost:5000`

### Docker Setup

```bash
docker-compose up -d
```

Access the dashboard at `http://localhost:5000`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/keys/fhe_public` | GET | Get CKKS public key for encryption |
| `/api/ingest/swap` | POST | Submit encrypted swap data |
| `/api/ingest/transaction` | POST | Submit encrypted transaction data |
| `/api/analytics/aggregate` | GET | Get decrypted aggregate swap metrics |
| `/api/analytics/transactions` | GET | Get decrypted transaction metrics |
| `/api/swaps/count` | GET | Get swap count and metadata |
| `/api/health` | GET | Health check |

## SDK Integration

### Kotlin (Android)

```kotlin
val client = FHEAnalyticsClient(httpClient, "http://your-server:5000/api")
client.initialize()

val metrics = SwapMetrics(
    amountZecIn = "1.5",
    amountOut = "100.0",
    destinationAsset = "USDC",
    // ... other fields
)
client.submitSwapMetrics(metrics)
```

### Swift (iOS)

```swift
let client = FHEAnalyticsClient(serverURL: "http://your-server:5000/api")
try await client.initialize()

let metrics = SwapMetrics(
    amountZecIn: "1.5",
    amountOut: "100.0",
    destinationAsset: "USDC"
    // ... other fields
)
try await client.submitSwapMetrics(metrics)
```

## Ethereum Oracle

The oracle contract is deployed on Sepolia testnet:
- **Contract Address**: `0x0eC2862d6480a988d7749e92C590B5a6fe61437f`
- [View on Etherscan](https://sepolia.etherscan.io/address/0x0eC2862d6480a988d7749e92C590B5a6fe61437f)

## Cryptographic Details

### CKKS Parameters
- **Polynomial Degree (N)**: 1024
- **Coefficient Modulus (q)**: ~40-bit prime
- **Scale**: 2^20
- **Security Level**: ~110 bits

### Threshold Decryption
- **Scheme**: 3-of-5 threshold
- **DKG**: Pedersen's Distributed Key Generation
- **Secret Sharing**: Shamir's Secret Sharing

## Security Considerations

- The CKKS implementation is for demonstration purposes
- For production use, consider using established FHE libraries (SEAL, OpenFHE)
- Threshold nodes should be operated by independent parties
- Regular security audits are recommended

## License

MIT License

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Acknowledgments

- Electric Coin Company for the Zcash ecosystem
- The FHE research community for CKKS development
