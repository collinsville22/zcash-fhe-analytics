$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$RustDir = Join-Path $RootDir "rust"
$AndroidDir = Join-Path $RootDir "android"

Write-Host "Building Zcash FHE Core for Android..." -ForegroundColor Cyan

if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Rust toolchain not found. Install from https://rustup.rs/" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command cargo-ndk -ErrorAction SilentlyContinue)) {
    Write-Host "Installing cargo-ndk..."
    cargo install cargo-ndk
}

Set-Location $RustDir

Write-Host "Adding Android targets..."
rustup target add aarch64-linux-android
rustup target add armv7-linux-androideabi
rustup target add x86_64-linux-android
rustup target add i686-linux-android

if (-not $env:ANDROID_NDK_HOME) {
    $PossibleNdkPaths = @(
        "$env:LOCALAPPDATA\Android\Sdk\ndk",
        "$env:ANDROID_HOME\ndk",
        "C:\Android\ndk"
    )

    foreach ($Path in $PossibleNdkPaths) {
        if (Test-Path $Path) {
            $NdkVersion = Get-ChildItem $Path -Directory | Sort-Object Name -Descending | Select-Object -First 1
            if ($NdkVersion) {
                $env:ANDROID_NDK_HOME = $NdkVersion.FullName
                break
            }
        }
    }

    if (-not $env:ANDROID_NDK_HOME) {
        Write-Host "Error: ANDROID_NDK_HOME not set and could not be auto-detected" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Using Android NDK: $env:ANDROID_NDK_HOME" -ForegroundColor Green

$JniLibsDir = Join-Path $AndroidDir "src\main\jniLibs"
New-Item -ItemType Directory -Force -Path $JniLibsDir | Out-Null

Write-Host "Building native libraries..."
cargo ndk -t armeabi-v7a -t arm64-v8a -t x86 -t x86_64 -o $JniLibsDir build --release

$GeneratedDir = Join-Path $AndroidDir "src\main\kotlin\co\electriccoin\zcash\fhe\generated"
New-Item -ItemType Directory -Force -Path $GeneratedDir | Out-Null

Write-Host "Generating uniffi bindings for Kotlin..."
cargo run --features=uniffi/cli --bin uniffi-bindgen generate `
    src/zcash_fhe_core.udl `
    --language kotlin `
    --out-dir $GeneratedDir

Write-Host "Android build complete." -ForegroundColor Green
Write-Host "Native libraries placed in: $JniLibsDir"
