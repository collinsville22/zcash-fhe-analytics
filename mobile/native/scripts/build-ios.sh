#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
RUST_DIR="$ROOT_DIR/rust"
IOS_DIR="$ROOT_DIR/ios"

echo "Building Zcash FHE Core for iOS..."

cd "$RUST_DIR"

rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim

cargo build --release --target aarch64-apple-ios
cargo build --release --target x86_64-apple-ios
cargo build --release --target aarch64-apple-ios-sim

echo "Creating XCFramework..."

FRAMEWORK_NAME="ZcashFHECore"
XCFRAMEWORK_PATH="$IOS_DIR/$FRAMEWORK_NAME.xcframework"

rm -rf "$XCFRAMEWORK_PATH"

HEADER_PATH="$IOS_DIR/include"
mkdir -p "$HEADER_PATH"

cargo run --features=uniffi/cli --bin uniffi-bindgen generate \
    src/zcash_fhe_core.udl \
    --language swift \
    --out-dir "$IOS_DIR/Sources/ZcashFHE/Generated"

cat > "$HEADER_PATH/zcash_fhe_core.h" << 'EOF'
#ifndef ZCASH_FHE_CORE_H
#define ZCASH_FHE_CORE_H

#include <stdint.h>
#include <stdbool.h>

void load_keys_from_hex(uint64_t chain_id, const char* public_key_hex, const char* crs_hex);
bool is_initialized(uint64_t chain_id);

#endif
EOF

cat > "$HEADER_PATH/module.modulemap" << 'EOF'
framework module ZcashFHECore {
    umbrella header "zcash_fhe_core.h"
    export *
    module * { export * }
}
EOF

DEVICE_LIB="$RUST_DIR/target/aarch64-apple-ios/release/libzcash_fhe_core.a"
SIM_ARM_LIB="$RUST_DIR/target/aarch64-apple-ios-sim/release/libzcash_fhe_core.a"
SIM_X86_LIB="$RUST_DIR/target/x86_64-apple-ios/release/libzcash_fhe_core.a"

COMBINED_SIM_LIB="$RUST_DIR/target/simulator-combined/libzcash_fhe_core.a"
mkdir -p "$(dirname "$COMBINED_SIM_LIB")"

lipo -create "$SIM_ARM_LIB" "$SIM_X86_LIB" -output "$COMBINED_SIM_LIB"

DEVICE_FRAMEWORK="$RUST_DIR/target/frameworks/ios-arm64/$FRAMEWORK_NAME.framework"
SIM_FRAMEWORK="$RUST_DIR/target/frameworks/ios-arm64_x86_64-simulator/$FRAMEWORK_NAME.framework"

mkdir -p "$DEVICE_FRAMEWORK/Headers"
mkdir -p "$SIM_FRAMEWORK/Headers"

cp "$DEVICE_LIB" "$DEVICE_FRAMEWORK/$FRAMEWORK_NAME"
cp "$COMBINED_SIM_LIB" "$SIM_FRAMEWORK/$FRAMEWORK_NAME"

cp "$HEADER_PATH/zcash_fhe_core.h" "$DEVICE_FRAMEWORK/Headers/"
cp "$HEADER_PATH/module.modulemap" "$DEVICE_FRAMEWORK/Headers/"
cp "$HEADER_PATH/zcash_fhe_core.h" "$SIM_FRAMEWORK/Headers/"
cp "$HEADER_PATH/module.modulemap" "$SIM_FRAMEWORK/Headers/"

cat > "$DEVICE_FRAMEWORK/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>$FRAMEWORK_NAME</string>
    <key>CFBundleIdentifier</key>
    <string>co.electriccoin.zcash.fhe.core</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundlePackageType</key>
    <string>FMWK</string>
</dict>
</plist>
EOF

cp "$DEVICE_FRAMEWORK/Info.plist" "$SIM_FRAMEWORK/Info.plist"

xcodebuild -create-xcframework \
    -framework "$DEVICE_FRAMEWORK" \
    -framework "$SIM_FRAMEWORK" \
    -output "$XCFRAMEWORK_PATH"

echo "XCFramework created at: $XCFRAMEWORK_PATH"
echo "iOS build complete."
