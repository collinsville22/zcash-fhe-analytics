const hre = require("hardhat");

async function main() {
    const oracleAddress = "0x5C314001677F13A8Ed44610a691f25aB6E3Ac4f5";

    const Oracle = await hre.ethers.getContractFactory("ZcashFHEOracle");
    const oracle = await Oracle.attach(oracleAddress);

    console.log("Connected to oracle:", oracleAddress);

    const metricsToInit = [
        "tx_count",
        "tx_volume_zec",
        "tx_fees_zec",
        "average_swap_zec",
        "btc_swaps",
        "eth_swaps",
        "usdc_swaps",
        "usdt_swaps",
        "total_fees_zec"
    ];

    console.log("\nInitializing missing metrics...");
    for (const metric of metricsToInit) {
        try {
            const tx = await oracle.initializeMetric(metric);
            await tx.wait();
            console.log("Initialized:", metric);
        } catch (e) {
            if (e.message.includes("Metric exists")) {
                console.log("Already exists:", metric);
            } else {
                console.log("Error on", metric + ":", e.message.substring(0, 80));
            }
        }
    }

    const updates = [
        { name: "swap_count", value: 15 },
        { name: "total_volume", value: 8886 },
        { name: "total_fees_zec", value: 22 },
        { name: "average_swap_zec", value: 592 },
        { name: "avg_fee", value: 15 },
        { name: "tx_count", value: 13 },
        { name: "tx_volume_zec", value: 55077 },
        { name: "tx_fees_zec", value: 1 },
        { name: "btc_swaps", value: 5 },
        { name: "eth_swaps", value: 2 },
        { name: "usdc_swaps", value: 1 },
        { name: "usdt_swaps", value: 7 },
        { name: "btc_swap_volume", value: 2500 },
        { name: "eth_swap_volume", value: 1200 }
    ];

    console.log("\nProposing metric updates...");
    for (const update of updates) {
        try {
            const tx = await oracle.proposeUpdate(update.name, update.value);
            await tx.wait();
            console.log("Proposed:", update.name, "=", update.value);
        } catch (e) {
            console.log("Error on", update.name + ":", e.message.substring(0, 80));
        }
    }

    console.log("\nFinal state:");
    const allMetrics = await oracle.getAllMetrics();
    for (const metricName of allMetrics) {
        const details = await oracle.getMetricDetails(metricName);
        console.log(metricName + ":", details[0].toString());
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
