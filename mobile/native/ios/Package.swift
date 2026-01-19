// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "ZcashFHE",
    platforms: [
        .iOS(.v15),
        .macOS(.v12)
    ],
    products: [
        .library(
            name: "ZcashFHE",
            targets: ["ZcashFHE"]
        ),
    ],
    targets: [
        .binaryTarget(
            name: "ZcashFHECore",
            path: "ZcashFHECore.xcframework"
        ),
        .target(
            name: "ZcashFHE",
            dependencies: ["ZcashFHECore"],
            path: "Sources/ZcashFHE"
        ),
        .testTarget(
            name: "ZcashFHETests",
            dependencies: ["ZcashFHE"],
            path: "Tests"
        ),
    ]
)
