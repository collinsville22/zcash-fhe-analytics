.PHONY: all ios android clean test install-android install-ios help

SHELL := /bin/bash

all: ios android

ios:
	@echo "Building iOS..."
	@chmod +x scripts/build-ios.sh
	@./scripts/build-ios.sh

android:
	@echo "Building Android..."
	@chmod +x scripts/build-android.sh
	@./scripts/build-android.sh

clean:
	@echo "Cleaning build artifacts..."
	@cd rust && cargo clean
	@rm -rf ios/ZcashFHECore.xcframework
	@rm -rf ios/include
	@rm -rf android/src/main/jniLibs
	@rm -rf rust/target/frameworks

test:
	@echo "Running tests..."
	@cd rust && cargo test

fmt:
	@cd rust && cargo fmt

lint:
	@cd rust && cargo clippy -- -D warnings

check: fmt lint test

install-android:
ifndef ZASHI_ANDROID
	$(error ZASHI_ANDROID is not set. Usage: make install-android ZASHI_ANDROID=/path/to/zashi-android)
endif
	@echo "Installing Android native libraries to $(ZASHI_ANDROID)..."
	@cp -r android/src/main/jniLibs $(ZASHI_ANDROID)/fhe-analytics-lib/src/main/

install-ios:
ifndef ZASHI_IOS
	$(error ZASHI_IOS is not set. Usage: make install-ios ZASHI_IOS=/path/to/zashi-ios)
endif
	@echo "Installing iOS XCFramework to $(ZASHI_IOS)..."
	@cp -r ios/ZcashFHECore.xcframework $(ZASHI_IOS)/modules/

help:
	@echo "Available targets:"
	@echo "  all            - Build for both Android and iOS"
	@echo "  android        - Build for Android only"
	@echo "  ios            - Build for iOS only (requires macOS)"
	@echo "  clean          - Remove all build artifacts"
	@echo "  test           - Run Rust tests"
	@echo "  fmt            - Format Rust code"
	@echo "  lint           - Run clippy lints"
	@echo "  check          - Run fmt, lint, and test"
	@echo "  install-android ZASHI_ANDROID=/path - Copy native libs to zashi-android"
	@echo "  install-ios ZASHI_IOS=/path         - Copy XCFramework to zashi-ios"
