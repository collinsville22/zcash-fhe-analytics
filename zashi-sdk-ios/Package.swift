// swift-tools-version: 5.7

import PackageDescription

let package = Package(
    name: "FHEAnalytics",
    platforms: [
        .iOS(.v16),
        .macOS(.v13)
    ],
    products: [
        .library(
            name: "FHEAnalytics",
            targets: ["FHEAnalytics"]
        ),
    ],
    dependencies: [],
    targets: [
        .target(
            name: "FHEAnalytics",
            dependencies: [],
            path: "Sources"
        ),
        .testTarget(
            name: "FHEAnalyticsTests",
            dependencies: ["FHEAnalytics"],
            path: "Tests"
        ),
    ]
)
