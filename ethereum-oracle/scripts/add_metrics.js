const hre = require("hardhat");

async function main() {
    console.log("Adding correct metrics to deployed oracle...");

    // Your deployed contract address
    const oracleAddress = "0x0eC2862d6480a988d7749e92C590B5a6fe61437f";

    const Oracle = await hre.ethers.getContractFactory("ZcashFHEOracle");
    const oracle = await Oracle.attach(oracleAddress);

    console.log("Connected to oracle at:", oracleAddress);

    // Initialize new correct metrics
    console.log("\nInitializing metrics that match Zashi swap data...");

    try {
        let tx = await oracle.initializeMetric("swap_count");
        await tx.wait();
        console.log(" Initialized: swap_count");
    } catch (e) {
        console.log("  swap_count might already exist or error:", e.message.substring(0, 100));
    }

    try {
        let tx = await oracle.initializeMetric("btc_swap_volume");
        await tx.wait();
        console.log(" Initialized: btc_swap_volume");
    } catch (e) {
        console.log("  btc_swap_volume might already exist or error:", e.message.substring(0, 100));
    }

    try {
        let tx = await oracle.initializeMetric("eth_swap_volume");
        await tx.wait();
        console.log(" Initialized: eth_swap_volume");
    } catch (e) {
        console.log("  eth_swap_volume might already exist or error:", e.message.substring(0, 100));
    }

    // Get all metrics
    console.log("\nAll initialized metrics:");
    const allMetrics = await oracle.getAllMetrics();
    allMetrics.forEach((metric, index) => {
        console.log(`${index + 1}. ${metric}`);
    });

    console.log("\n Oracle updated successfully!");
    console.log(`\nView on Etherscan: https://sepolia.etherscan.io/address/${oracleAddress}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
