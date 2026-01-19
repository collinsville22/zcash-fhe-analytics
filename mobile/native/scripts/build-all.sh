#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================"
echo "Building Zcash FHE Native SDK"
echo "========================================"

if [[ "$OSTYPE" == "darwin"* ]]; then
    echo ""
    echo "Building for iOS..."
    "$SCRIPT_DIR/build-ios.sh"
fi

echo ""
echo "Building for Android..."
"$SCRIPT_DIR/build-android.sh"

echo ""
echo "========================================"
echo "Build complete!"
echo "========================================"
echo ""
echo "iOS XCFramework: mobile/native/ios/ZcashFHECore.xcframework"
echo "Android JNI libs: mobile/native/android/src/main/jniLibs/"
