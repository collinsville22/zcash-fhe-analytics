#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
RUST_DIR="$ROOT_DIR/rust"
ANDROID_DIR="$ROOT_DIR/android"

echo "Building Zcash FHE Core for Android..."

if ! command -v cargo-ndk &> /dev/null; then
    echo "Installing cargo-ndk..."
    cargo install cargo-ndk
fi

cd "$RUST_DIR"

rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android i686-linux-android

if [ -z "$ANDROID_NDK_HOME" ]; then
    if [ -d "$HOME/Android/Sdk/ndk" ]; then
        export ANDROID_NDK_HOME=$(ls -d "$HOME/Android/Sdk/ndk"/*/ | head -1)
    elif [ -d "$ANDROID_HOME/ndk" ]; then
        export ANDROID_NDK_HOME=$(ls -d "$ANDROID_HOME/ndk"/*/ | head -1)
    else
        echo "Error: ANDROID_NDK_HOME not set and could not be auto-detected"
        exit 1
    fi
fi

echo "Using Android NDK: $ANDROID_NDK_HOME"

cargo ndk -t armeabi-v7a -t arm64-v8a -t x86 -t x86_64 -o "$ANDROID_DIR/src/main/jniLibs" build --release

echo "Generating uniffi bindings for Kotlin..."
cargo run --features=uniffi/cli --bin uniffi-bindgen generate \
    src/zcash_fhe_core.udl \
    --language kotlin \
    --out-dir "$ANDROID_DIR/src/main/kotlin/co/electriccoin/zcash/fhe/generated"

echo "Android build complete."
echo "Native libraries placed in: $ANDROID_DIR/src/main/jniLibs"
