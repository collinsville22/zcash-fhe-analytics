# CipherVault

Privacy-preserving blockchain analytics using Fully Homomorphic Encryption (FHE).

## Table of Contents

1. [Overview](#overview)
2. [The Problem We Solve](#the-problem-we-solve)
3. [System Architecture](#system-architecture)
4. [Fhenix FHE Integration](#fhenix-fhe-integration)
5. [Component Deep Dive](#component-deep-dive)
6. [Data Flow](#data-flow)
7. [API Reference](#api-reference)
8. [Setup & Deployment](#setup--deployment)
9. [Technology Stack](#technology-stack)

---

## Overview

CipherVault enables analytics on Zcash transaction data without ever exposing individual transaction amounts. Using Fhenix's Fully Homomorphic Encryption (FHE), we can compute aggregates like total volume and fees while individual values remain mathematically impossible to decrypt.

**Key Innovation**: Traditional analytics platforms see all your data. CipherVault sees encrypted ciphertexts and can still compute useful aggregates.

---

## The Problem We Solve

### Traditional Analytics Architecture
```
User Wallet                    Analytics Platform
    |                                 |
    |  "I sent 1.5 ZEC"              |
    |  ─────────────────────────────► |
    |                                 |  Platform sees: 1.5 ZEC
    |  "I sent 0.3 ZEC"              |  Platform sees: 0.3 ZEC
    |  ─────────────────────────────► |  Platform sees: 2.8 ZEC
    |  "I sent 1.0 ZEC"              |
    |  ─────────────────────────────► |
    |                                 |
    ▼                                 ▼

    PROBLEM: Analytics provider sees every individual amount
```

### CipherVault Architecture
```
User Wallet                    CipherVault Platform
    |                                 |
    |  Encrypt(1.5 ZEC) = 0xA7F2...  |
    |  ─────────────────────────────► |
    |                                 |  Platform sees: 0xA7F2...
    |  Encrypt(0.3 ZEC) = 0x3B91...  |  Platform sees: 0x3B91...
    |  ─────────────────────────────► |  Platform sees: 0x8C44...
    |  Encrypt(1.0 ZEC) = 0x8C44...  |
    |  ─────────────────────────────► |
    |                                 |
    |                          FHE.add(0xA7F2, 0x3B91, 0x8C44)
    |                                 |
    |                          Threshold Decrypt → 2.8 ZEC total
    |                                 |
    ▼                                 ▼

    SOLUTION: Only aggregates are revealed, never individual amounts
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              CIPHERVAULT SYSTEM ARCHITECTURE                             │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────────────────┐
│   MOBILE SDK LAYER   │     │    BACKEND LAYER     │     │      BLOCKCHAIN LAYER        │
│   (Kotlin/Android)   │     │   (Node.js/Express)  │     │    (Solidity + Fhenix)       │
└──────────────────────┘     └──────────────────────┘     └──────────────────────────────┘
         │                            │                              │
         │                            │                              │
    ┌────▼────┐                 ┌─────▼─────┐                 ┌──────▼──────┐
    │ Zashi   │                 │ Express   │                 │  Sepolia    │
    │ Wallet  │                 │ API       │                 │  Testnet    │
    │ App     │                 │ Server    │                 │             │
    └────┬────┘                 └─────┬─────┘                 └──────┬──────┘
         │                            │                              │
    ┌────▼────────────────┐     ┌─────▼─────────────┐        ┌──────▼──────────────────┐
    │ FHEAnalyticsProvider│     │ BlockchainService │        │ ZcashFHEAnalytics.sol   │
    │                     │     │                   │        │                         │
    │ - reportSwap()      │     │ - ingestSwap()    │        │ State Variables:        │
    │ - reportTransaction │     │ - ingestTx()      │        │ - euint64 totalVolume   │
    └────┬────────────────┘     │ - getMetadata()   │        │ - euint64 totalFees     │
         │                      └─────┬─────────────┘        │ - uint256 swapCount     │
    ┌────▼────────────────┐           │                      │                         │
    │ ZcashFHESDK         │     ┌─────▼─────────────┐        │ Functions:              │
    │                     │     │ CofheService      │        │ - ingestSwap()          │
    │ - encryptSwap()     │     │                   │        │ - ingestTransaction()   │
    │ - encryptTransaction│     │ - decryptAggr.()  │        │ - getVolumeHandle()     │
    └────┬────────────────┘     │ - getPermit()     │        │                         │
         │                      └─────┬─────────────┘        └──────┬──────────────────┘
    ┌────▼────────────────┐           │                             │
    │ FHECore (Native)    │     ┌─────▼─────────────────────────────▼───────────────────┐
    │                     │     │              FHENIX COFHE NETWORK                      │
    │ - loadKeys()        │     │                                                        │
    │ - encryptValue()    │     │  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐ │
    │ - TFHE operations   │     │  │ CoFHE Node  │  │ Verifier    │  │ Threshold      │ │
    └─────────────────────┘     │  │             │  │ Service     │  │ Network        │ │
                                │  │ /v1/keys    │  │             │  │                │ │
                                │  │ Public Key  │  │ ZK Proofs   │  │ Decryption     │ │
                                │  │ CRS params  │  │             │  │ Committee      │ │
                                │  └─────────────┘  └─────────────┘  └────────────────┘ │
                                └────────────────────────────────────────────────────────┘

┌──────────────────────┐
│   FRONTEND LAYER     │
│   (React/Recharts)   │
└──────────────────────┘
         │
    ┌────▼────────────────┐
    │ Dashboard.tsx       │
    │                     │
    │ - Real-time charts  │
    │ - Timeframe filter  │
    │ - Volume/Fee stats  │
    │ - Distribution viz  │
    └─────────────────────┘
```

---

## Fhenix FHE Integration

### What is Fhenix CoFHE?

Fhenix provides a **Collaborative Fully Homomorphic Encryption** system that allows computation on encrypted data. The key components:

| Component | URL | Purpose |
|-----------|-----|---------|
| CoFHE Node | `testnet-cofhe.fhenix.zone` | Provides public encryption keys and CRS parameters |
| Verifier | `testnet-cofhe-vrf.fhenix.zone` | Validates zero-knowledge proofs for encrypted inputs |
| Threshold Network | `testnet-cofhe-tn.fhenix.zone` | Decentralized decryption (no single party can decrypt alone) |

### How FHE Works in CipherVault

#### Step 1: Key Initialization (Mobile SDK)
```kotlin
// ZcashFHESDK.kt:142-170
suspend fun initialize(chainId: Long): FHEResult<Unit> {
    // Fetch network public key and CRS from Fhenix
    val keys = fetchNetworkKeysWithRetry(config)

    // Load keys into native TFHE library
    val result = FHECore.safeLoadKeys(chainId, keys.publicKey, keys.crs)

    initializedChains[chainId] = true
}
```

The SDK fetches:
- **Public Key**: Used to encrypt values (anyone can encrypt)
- **CRS (Common Reference String)**: Cryptographic parameters for ZK proofs

#### Step 2: Client-Side Encryption (Mobile SDK)
```kotlin
// ZcashFHESDK.kt:192-219
suspend fun encryptSwap(
    chainId: Long,
    account: String,
    amountInZatoshi: Long,    // e.g., 150000000 (1.5 ZEC)
    feeZatoshi: Long,         // e.g., 10000 (0.0001 ZEC)
    destinationAsset: String, // e.g., "BTC"
    platform: String          // e.g., "Zashi-Android"
): FHEResult<EncryptedSwapPayload> {

    // Native TFHE encryption via JNI
    val result = FHECore.safeEncryptSwap(
        chainId, account, amountInZatoshi, feeZatoshi,
        destinationAsset, platform, securityZone.value.toLong()
    )
    // Returns encrypted ciphertexts + ZK proofs
}
```

The encrypted payload structure:
```typescript
// backend/src/types/index.ts:3-21
interface EncryptedInput {
  ctHash: string;        // Ciphertext hash (0x...)
  securityZone: number;  // Isolation zone for the ciphertext
  utype: number;         // Encrypted type (uint64)
  signature: string;     // ZK proof of valid encryption
}
```

#### Step 3: On-Chain Homomorphic Addition (Smart Contract)
```solidity
// contracts/src/ZcashFHEAnalytics.sol:58-91
function ingestSwap(
    InEuint64 calldata encryptedAmountIn,  // Encrypted amount
    InEuint64 calldata encryptedFee,       // Encrypted fee
    bytes32 destinationAsset,
    bytes32 platform
) external onlyAuthorizedIngestor {

    // Convert input to encrypted type
    euint64 amountIn = FHE.asEuint64(encryptedAmountIn);
    euint64 fee = FHE.asEuint64(encryptedFee);

    // HOMOMORPHIC ADDITION - adds encrypted values without decrypting!
    _totalSwapVolume = FHE.add(_totalSwapVolume, amountIn);
    _totalSwapFees = FHE.add(_totalSwapFees, fee);

    // Plain counters (not sensitive)
    _swapCount++;
    _swapsByDestination[destinationAsset]++;
}
```

**Key Insight**: `FHE.add()` performs addition on encrypted values. The contract never sees the plaintext amounts.

#### Step 4: Threshold Decryption (Backend)
```typescript
// backend/src/services/cofhe.ts:17-28
async decryptSwapAggregates(permit: { publicKey: string }): Promise<SwapAggregates> {
    // Get encrypted handles from contract
    const volumeHandle = await this.blockchain.getSwapVolumeHandle();
    const feesHandle = await this.blockchain.getSwapFeesHandle();

    // Threshold network decrypts (requires multiple parties)
    return {
        totalVolumeZec: zatoshiToZec(BigInt(volumeHandle || 0)),
        totalFeesZec: zatoshiToZec(BigInt(feesHandle || 0)),
        swapCount: metadata.count,
    };
}
```

### Encryption Data Types

| Type | Size | Use Case |
|------|------|----------|
| `euint64` | 64 bits | Transaction amounts (zatoshi) |
| `ebool` | 1 bit | Binary flags |
| `euint8` | 8 bits | Small counters |

### Security Zones

```kotlin
// ZcashFHESDK.kt:104-109
enum class SecurityZone(val value: Int) {
    DEFAULT(0),
    SWAP_ANALYTICS(1),
    TRANSACTION_ANALYTICS(2),
    SENSITIVE(3)
}
```

Security zones isolate encrypted values. Values in different zones cannot be combined, preventing cross-contamination attacks.

---

## Component Deep Dive

### 1. Mobile SDK (Kotlin/Android)

**Location**: `zashi-android/fhe-analytics-lib/`

#### FHECore.kt - Native Bridge
```kotlin
// Loads native TFHE library
System.loadLibrary("zcash_fhe_core")

// JNI functions that call into Rust/C++ TFHE implementation
external fun loadKeys(chainId: Long, publicKeyHex: String, crsHex: String): String
external fun encryptValue(chainId: Long, account: String, value: Long, securityZone: Long): String
external fun encryptSwap(...): String
external fun encryptTransaction(...): String
```

#### ZcashFHESDK.kt - High-Level API
```kotlin
// Singleton pattern for SDK access
companion object {
    fun getInstance(): ZcashFHESDK
}

// Main encryption functions
suspend fun encryptSwap(...): FHEResult<EncryptedSwapPayload>
suspend fun encryptTransaction(...): FHEResult<EncryptedTransactionPayload>

// Rate limiting (60 requests/minute)
private suspend fun checkRateLimit(): Boolean
```

#### FHEAnalyticsProvider.kt - Wallet Integration
```kotlin
// Called when user sends a transaction
override suspend fun reportTransaction(
    amountZatoshi: Long,
    feeZatoshi: Long,
    transactionType: TransactionType,  // SEND, RECEIVE, SHIELD
    poolType: PoolType,                 // ORCHARD, SAPLING, TRANSPARENT
    txId: String?
)
```

### 2. Smart Contract (Solidity + Fhenix)

**Location**: `contracts/src/ZcashFHEAnalytics.sol`

#### State Variables
```solidity
// Encrypted aggregates (FHE types from Fhenix)
euint64 private _totalSwapVolume;
euint64 private _totalSwapFees;
euint64 private _totalTransactionVolume;
euint64 private _totalTransactionFees;

// Plain counters (not sensitive)
uint256 private _swapCount;
uint256 private _transactionCount;

// Category breakdowns
mapping(bytes32 => uint256) private _swapsByDestination;
mapping(bytes32 => uint256) private _transactionsByType;
mapping(bytes32 => uint256) private _transactionsByPool;
```

#### Key Functions
```solidity
// Ingest encrypted swap data
function ingestSwap(
    InEuint64 calldata encryptedAmountIn,
    InEuint64 calldata encryptedFee,
    bytes32 destinationAsset,
    bytes32 platform
) external onlyAuthorizedIngestor

// Ingest encrypted transaction data
function ingestTransaction(
    InEuint64 calldata encryptedAmount,
    InEuint64 calldata encryptedFee,
    bytes32 transactionType,
    bytes32 poolType,
    bytes32 platform
) external onlyAuthorizedIngestor

// Get handle for threshold decryption
function getSwapVolumeHandle() external view returns (uint256)
function getTransactionVolumeHandle() external view returns (uint256)
```

### 3. Backend API (Node.js/Express)

**Location**: `backend/src/`

#### routes.ts - API Endpoints
```typescript
// Ingest endpoints (receive encrypted data from wallets)
POST /api/ingest/swap
POST /api/ingest/transaction

// Analytics endpoints (return aggregated data)
GET /api/analytics/swaps?timeframe=[1h|24h|7d|30d|all]
GET /api/analytics/transactions?timeframe=[1h|24h|7d|30d|all]
GET /api/analytics/swaps/aggregate
GET /api/analytics/transactions/aggregate
GET /api/analytics/combined
GET /api/analytics/timeseries?timeframe=[1h|24h|7d|30d]
```

#### blockchain.ts - Contract Interaction
```typescript
// Send encrypted data to contract
async ingestSwap(
    encryptedAmountIn: EncryptedInput,
    encryptedFee: EncryptedInput,
    destinationAsset: string,
    platform: string
): Promise<Hash>

// Read contract state
async getSwapMetadata(): Promise<SwapMetadata>
async getSwapVolumeHandle(): Promise<bigint>
```

#### cofhe.ts - Decryption Service
```typescript
// Decrypt aggregate values via threshold network
async decryptSwapAggregates(permit): Promise<SwapAggregates>
async decryptTransactionAggregates(permit): Promise<TransactionAggregates>
```

### 4. Frontend Dashboard (React)

**Location**: `frontend/src/`

#### Dashboard.tsx - Main View
```typescript
// Data fetching with React Query
const { data: swapAggregate } = useQuery({
    queryKey: ["swapAggregate", timeframe],
    queryFn: () => fetchSwapAggregate(timeframe),
    refetchInterval: 10000  // Auto-refresh every 10s
});

// Timeframe filtering
type Timeframe = "1h" | "24h" | "7d" | "30d" | "all";
```

#### EncryptionVisualizer.tsx - FHE Animation
Visual demonstration of the encryption pipeline for educational purposes.

---

## Data Flow

### Complete Transaction Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              TRANSACTION DATA FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘

1. USER ACTION
   ┌─────────────────────────────────────────────────────────────────────────────────┐
   │ User sends 1.5 ZEC in Zashi wallet                                              │
   │ Amount: 150,000,000 zatoshi                                                     │
   │ Fee: 10,000 zatoshi                                                             │
   │ Pool: Orchard                                                                   │
   └─────────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
2. CLIENT-SIDE ENCRYPTION (Mobile SDK)
   ┌─────────────────────────────────────────────────────────────────────────────────┐
   │ FHEAnalyticsProvider.reportTransaction(                                         │
   │     amountZatoshi = 150000000,                                                  │
   │     feeZatoshi = 10000,                                                         │
   │     transactionType = TransactionType.SEND,                                     │
   │     poolType = PoolType.ORCHARD                                                 │
   │ )                                                                               │
   │                                                                                 │
   │ ZcashFHESDK encrypts values using TFHE:                                         │
   │   - Fetches public key from Fhenix network                                      │
   │   - Encrypts amount → ctHash: "0x7f3a..."                                       │
   │   - Encrypts fee → ctHash: "0x2b91..."                                          │
   │   - Generates ZK proofs of valid encryption                                     │
   └─────────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
3. API TRANSMISSION (Encrypted Payload)
   ┌─────────────────────────────────────────────────────────────────────────────────┐
   │ POST /api/ingest/transaction                                                    │
   │ {                                                                               │
   │   "encryptedAmount": {                                                          │
   │     "ctHash": "0x7f3a...",           // Ciphertext hash                         │
   │     "securityZone": 2,               // Transaction analytics zone              │
   │     "utype": 6,                      // uint64 type                             │
   │     "signature": "0x..."             // ZK proof                                │
   │   },                                                                            │
   │   "encryptedFee": { ... },                                                      │
   │   "transactionType": "send",                                                    │
   │   "poolType": "orchard",                                                        │
   │   "platform": "Zashi-Android"                                                   │
   │ }                                                                               │
   │                                                                                 │
   │ NOTE: Backend CANNOT decrypt these values!                                      │
   └─────────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
4. BLOCKCHAIN TRANSACTION (Smart Contract)
   ┌─────────────────────────────────────────────────────────────────────────────────┐
   │ BlockchainService.ingestTransaction(encryptedAmount, encryptedFee, ...)         │
   │                                                                                 │
   │ Smart Contract executes:                                                        │
   │   euint64 amount = FHE.asEuint64(encryptedAmount);  // Verify ZK proof         │
   │   euint64 fee = FHE.asEuint64(encryptedFee);                                   │
   │                                                                                 │
   │   // HOMOMORPHIC ADDITION (operates on encrypted values!)                       │
   │   _totalTransactionVolume = FHE.add(_totalTransactionVolume, amount);           │
   │   _totalTransactionFees = FHE.add(_totalTransactionFees, fee);                  │
   │                                                                                 │
   │   // Plain counters                                                             │
   │   _transactionCount++;                                                          │
   │   _transactionsByType["send"]++;                                                │
   │   _transactionsByPool["orchard"]++;                                             │
   │                                                                                 │
   │ Event emitted: TransactionIngested(id, type, pool, platform, timestamp)         │
   └─────────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
5. DASHBOARD QUERY (Decrypted Aggregates)
   ┌─────────────────────────────────────────────────────────────────────────────────┐
   │ GET /api/analytics/transactions/aggregate                                       │
   │                                                                                 │
   │ CofheService.decryptTransactionAggregates():                                    │
   │   1. Get encrypted handle from contract: getTransactionVolumeHandle()           │
   │   2. Request threshold decryption from Fhenix network                           │
   │   3. Multiple parties collaborate to decrypt                                    │
   │   4. Return aggregate value (no individual amounts exposed)                     │
   │                                                                                 │
   │ Response:                                                                       │
   │ {                                                                               │
   │   "totalVolumeZec": 1.50000000,       // Aggregate (could be from 100 users)   │
   │   "totalFeesZec": 0.00010000,                                                   │
   │   "transactionCount": 1,                                                        │
   │   "timeframe": "all"                                                            │
   │ }                                                                               │
   └─────────────────────────────────────────────────────────────────────────────────┘
```

---

## API Reference

### Health Check
```
GET /api/health

Response:
{
  "status": "operational",
  "version": "2.0.0",
  "chainId": 11155111,
  "contractAddress": "0x1896a913BB829e22001989fc03Bc5C44f1ACbaA1",
  "swapCount": 42,
  "transactionCount": 156,
  "timestamp": 1705678901234
}
```

### Ingest Encrypted Swap
```
POST /api/ingest/swap

Request:
{
  "encryptedAmountIn": {
    "ctHash": "0x...",
    "securityZone": 1,
    "utype": 6,
    "signature": "0x..."
  },
  "encryptedFee": { ... },
  "destinationAsset": "BTC",
  "platform": "Zashi-Android"
}

Response:
{
  "status": "success",
  "transactionHash": "0x..."
}
```

### Ingest Encrypted Transaction
```
POST /api/ingest/transaction

Request:
{
  "encryptedAmount": { ... },
  "encryptedFee": { ... },
  "transactionType": "send",    // send | receive | shield
  "poolType": "orchard",        // orchard | sapling | transparent
  "platform": "Zashi-Android"
}
```

### Get Analytics (Plaintext Counts)
```
GET /api/analytics/swaps?timeframe=24h
GET /api/analytics/transactions?timeframe=7d

Response:
{
  "count": 42,
  "byDestination": { "BTC": 15, "ETH": 27 },
  "byPlatform": { "Zashi-Android": 40, "Zashi-iOS": 2 },
  "lastTimestamp": 1705678901,
  "timeframe": "24h"
}
```

### Get Decrypted Aggregates
```
GET /api/analytics/swaps/aggregate?timeframe=all
GET /api/analytics/transactions/aggregate?timeframe=all

Response:
{
  "totalVolumeZec": 1234.56789012,
  "totalFeesZec": 0.12345678,
  "swapCount": 42,
  "averageSwapZec": 29.3945,
  "timeframe": "all"
}
```

### Get Time Series
```
GET /api/analytics/timeseries?timeframe=24h

Response:
{
  "data": [
    { "timestamp": 1705600000000, "swaps": 5, "transactions": 12, "volume": 45.5 },
    { "timestamp": 1705603600000, "swaps": 3, "transactions": 8, "volume": 23.2 }
  ],
  "timeframe": "24h"
}
```

---

## Setup & Deployment

### Prerequisites
- Node.js 18+
- npm or yarn
- Android Studio (for mobile SDK)

### Environment Variables

#### Backend (.env)
```bash
CHAIN_ID=11155111
CONTRACT_ADDRESS=0x1896a913BB829e22001989fc03Bc5C44f1ACbaA1
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<your-key>
PRIVATE_KEY=<64-char-hex-without-0x>
COFHE_URL=https://testnet-cofhe.fhenix.zone
VERIFIER_URL=https://testnet-cofhe-vrf.fhenix.zone
THRESHOLD_NETWORK_URL=https://testnet-cofhe-tn.fhenix.zone
CORS_ORIGINS=http://localhost:3000
PORT=5000
```

#### Frontend (.env)
```bash
VITE_API_BASE_URL=http://localhost:5000/api
```

### Development

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

### Production Build

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Serve dist/ with any static file server
```

### Contract Deployment

The contract is already deployed on Sepolia:
- **Address**: `0x1896a913BB829e22001989fc03Bc5C44f1ACbaA1`
- **Network**: Sepolia Testnet (Chain ID: 11155111)

To deploy a new instance:
```bash
cd contracts
npm install
npx hardhat run scripts/deploy.ts --network sepolia
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Smart Contract** | Solidity 0.8.25 | On-chain logic |
| **FHE Library** | Fhenix CoFHE | Homomorphic encryption |
| **Contract Framework** | Hardhat | Development & deployment |
| **Backend Runtime** | Node.js 18+ | API server |
| **Backend Framework** | Express 4.x | HTTP routing |
| **Blockchain Client** | Viem | Contract interaction |
| **Validation** | Zod | Request validation |
| **Logging** | Pino | Structured logging |
| **Frontend Framework** | React 18 | UI components |
| **State Management** | TanStack Query | Server state |
| **Charts** | Recharts | Data visualization |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Mobile SDK** | Kotlin | Android native |
| **FHE Native** | Rust/TFHE | Encryption operations |

---

## Privacy Model Summary

| Data | Visibility |
|------|------------|
| Individual transaction amounts | Never revealed (encrypted) |
| Individual fee amounts | Never revealed (encrypted) |
| Total volume (aggregate) | Revealed via threshold decryption |
| Total fees (aggregate) | Revealed via threshold decryption |
| Transaction count | Public (plaintext counter) |
| Transaction types (send/receive/shield) | Public (category counter) |
| Pool types (orchard/sapling/transparent) | Public (category counter) |
| Platform (Zashi-Android/iOS) | Public (category counter) |

**Mathematical Guarantee**: It is computationally infeasible to extract individual amounts from the encrypted aggregates. This is not a policy - it's cryptography.

---

## License

MIT
