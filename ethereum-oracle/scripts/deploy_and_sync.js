const hre = require("hardhat");

async function main() {
    console.log("Deploying new oracle with threshold=1...");

    const Oracle = await hre.ethers.getContractFactory("ZcashFHEOracle");
    const oracle = await Oracle.deploy(1);
    await oracle.waitForDeployment();

    const address = await oracle.getAddress();
    console.log("New Oracle deployed to:", address);

    const metrics = [
        "swap_count",
        "total_volume_zec",
        "total_fees_zec",
        "average_swap_zec",
        "tx_count",
        "tx_volume_zec",
        "tx_fees_zec",
        "btc_swaps",
        "eth_swaps",
        "usdc_swaps",
        "usdt_swaps",
        "combined_volume_zec"
    ];

    console.log("\nInitializing metrics...");
    for (const metric of metrics) {
        const tx = await oracle.initializeMetric(metric);
        await tx.wait();
        console.log("Initialized:", metric);
    }

    const updates = [
        { name: "swap_count", value: 15 },
        { name: "total_volume_zec", value: 8886 },
        { name: "total_fees_zec", value: 22 },
        { name: "average_swap_zec", value: 592 },
        { name: "tx_count", value: 13 },
        { name: "tx_volume_zec", value: 55077 },
        { name: "tx_fees_zec", value: 1 },
        { name: "btc_swaps", value: 5 },
        { name: "eth_swaps", value: 2 },
        { name: "usdc_swaps", value: 1 },
        { name: "usdt_swaps", value: 7 },
        { name: "combined_volume_zec", value: 63963 }
    ];

    console.log("\nUpdating values...");
    for (const update of updates) {
        const tx = await oracle.proposeUpdate(update.name, update.value);
        await tx.wait();
        console.log("Updated:", update.name, "=", update.value);
    }

    console.log("\nFinal state:");
    const allMetrics = await oracle.getAllMetrics();
    for (const metricName of allMetrics) {
        const details = await oracle.getMetricDetails(metricName);
        console.log(metricName + ":", details[0].toString());
    }

    console.log("\nNew contract address:", address);
    console.log("Update frontend/index.html with this address");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
