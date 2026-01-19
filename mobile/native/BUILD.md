# Building Zcash FHE Native Libraries

## Prerequisites

### 1. Install Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

### 2. Install cargo-ndk (for Android)
```bash
cargo install cargo-ndk
```

### 3. Android NDK
Set the `ANDROID_NDK_HOME` environment variable to your NDK installation path.

### 4. Xcode Command Line Tools (for iOS, macOS only)
```bash
xcode-select --install
```

## Quick Build

### All Platforms (macOS)
```bash
cd mobile/native
./scripts/build-all.sh
```

### Android Only
```bash
cd mobile/native
./scripts/build-android.sh
```

### iOS Only (macOS required)
```bash
cd mobile/native
./scripts/build-ios.sh
```

## Install to Zashi

### Android
```bash
make install-android ZASHI_ANDROID=/path/to/zashi-android
```
This copies `jniLibs/` to `zashi-android/fhe-analytics-lib/src/main/`

### iOS
```bash
make install-ios ZASHI_IOS=/path/to/zashi-ios
```
This copies `ZcashFHECore.xcframework` to `zashi-ios/modules/`

## Manual Installation

### Android
Copy the following directory:
```
android/src/main/jniLibs/
├── arm64-v8a/
│   └── libzcash_fhe_core.so
├── armeabi-v7a/
│   └── libzcash_fhe_core.so
├── x86/
│   └── libzcash_fhe_core.so
└── x86_64/
    └── libzcash_fhe_core.so
```
To: `zashi-android/fhe-analytics-lib/src/main/jniLibs/`

### iOS
Copy:
```
ios/ZcashFHECore.xcframework
```
To: `zashi-ios/modules/` (or update the path in Package.swift)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Zashi Wallet App                        │
├─────────────────────────────────────────────────────────────┤
│                   FHEAnalyticsProvider                       │
│            (Kotlin/Swift - ui-lib/FHEAnalytics)              │
├─────────────────────────────────────────────────────────────┤
│                      ZcashFHESDK                             │
│              (Kotlin/Swift - fhe-analytics-lib)              │
├─────────────────────────────────────────────────────────────┤
│                       FHECore                                │
│                  (JNI/FFI bindings)                          │
├─────────────────────────────────────────────────────────────┤
│                  libzcash_fhe_core                           │
│              (Rust native library)                           │
├─────────────────────────────────────────────────────────────┤
│                    TFHE Library                              │
│         (Fully Homomorphic Encryption)                       │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

1. Transaction completed in wallet
2. FHEAnalyticsProvider receives transaction data (amount, fee, type)
3. ZcashFHESDK.encryptTransaction() called
4. Native library performs FHE encryption using TFHE
5. Encrypted payload (ciphertexts + ZK proofs) sent to backend
6. Backend stores encrypted analytics
7. Homomorphic aggregation performed on encrypted data
8. Only aggregates are threshold-decrypted (individual values never exposed)

## Troubleshooting

### UnsatisfiedLinkError (Android)
The native library is missing. Ensure `jniLibs/` contains the `.so` files.

### ZcashFHECore not found (iOS)
The XCFramework is missing. Build it on macOS using `./scripts/build-ios.sh`.

### Rust compilation errors
Ensure you have the latest stable Rust: `rustup update stable`

### Android NDK not found
Set `ANDROID_NDK_HOME`:
```bash
export ANDROID_NDK_HOME=$HOME/Android/Sdk/ndk/25.2.9519653
```
