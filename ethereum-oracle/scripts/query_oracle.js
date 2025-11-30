const hre = require("hardhat");

async function main() {
    const oracleAddress = "0x0eC2862d6480a988d7749e92C590B5a6fe61437f";

    const Oracle = await hre.ethers.getContractFactory("ZcashFHEOracle");
    const oracle = await Oracle.attach(oracleAddress);

    console.log("Oracle Address:", oracleAddress);
    console.log("Network: Sepolia Testnet");

    const threshold = await oracle.threshold();
    console.log("Threshold:", threshold.toString(), "of 5");

    console.log("\nInitialized Metrics:");
    const allMetrics = await oracle.getAllMetrics();

    if (allMetrics.length === 0) {
        console.log("No metrics initialized");
    } else {
        for (const metricName of allMetrics) {
            const details = await oracle.getMetricDetails(metricName);
            const [value, timestamp, updateCount, isActive] = details;
            const date = new Date(Number(timestamp) * 1000);

            console.log("\n" + metricName);
            console.log("  Value:", value.toString());
            console.log("  Last Updated:", date.toISOString());
            console.log("  Update Count:", updateCount.toString());
            console.log("  Active:", isActive);
        }
    }

    const proposalCounter = await oracle.proposalCounter();
    console.log("\nTotal Proposals:", proposalCounter.toString());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
