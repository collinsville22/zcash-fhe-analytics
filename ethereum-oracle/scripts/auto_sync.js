const hre = require("hardhat");

const BACKEND_URL = "http://127.0.0.1:5000/api";
const ORACLE_ADDRESS = "0x0eC2862d6480a988d7749e92C590B5a6fe61437f";

async function fetchBackendMetrics() {
    const [aggregateRes, txRes, countRes] = await Promise.all([
        fetch(`${BACKEND_URL}/analytics/aggregate`),
        fetch(`${BACKEND_URL}/analytics/transactions`),
        fetch(`${BACKEND_URL}/swaps/count`)
    ]);

    const aggregate = await aggregateRes.json();
    const transactions = await txRes.json();
    const swapCount = await countRes.json();

    return {
        swap_count: swapCount.count || 0,
        total_volume_zec: Math.round((aggregate.total_volume_zec || 0) * 100),
        total_fees_zec: Math.round((aggregate.total_fees_zec || 0) * 100),
        average_swap_zec: Math.round((aggregate.average_swap_zec || 0) * 100),
        tx_count: transactions.num_transactions || 0,
        tx_volume_zec: Math.round((transactions.total_volume_zec || 0) * 100),
        tx_fees_zec: Math.round((transactions.total_fees_zec || 0) * 1000000),
        btc_swaps: swapCount.by_destination?.BTC || 0,
        eth_swaps: swapCount.by_destination?.ETH || 0,
        usdc_swaps: swapCount.by_destination?.USDC || 0,
        usdt_swaps: swapCount.by_destination?.USDT || 0,
        combined_volume_zec: Math.round(((aggregate.total_volume_zec || 0) + (transactions.total_volume_zec || 0)) * 100)
    };
}

async function main() {
    console.log("Fetching metrics from backend...");
    const metrics = await fetchBackendMetrics();

    console.log("\nBackend metrics:");
    for (const [key, value] of Object.entries(metrics)) {
        console.log(`  ${key}: ${value}`);
    }

    const Oracle = await hre.ethers.getContractFactory("ZcashFHEOracle");
    const oracle = await Oracle.attach(ORACLE_ADDRESS);

    console.log("\nConnected to oracle:", ORACLE_ADDRESS);

    console.log("\nUpdating on-chain values...");
    for (const [name, value] of Object.entries(metrics)) {
        try {
            const details = await oracle.getMetricDetails(name);
            const currentValue = Number(details[0]);

            if (currentValue !== value) {
                const tx = await oracle.proposeUpdate(name, value);
                await tx.wait();
                console.log(`Updated ${name}: ${currentValue} -> ${value}`);
            } else {
                console.log(`Unchanged ${name}: ${value}`);
            }
        } catch (e) {
            console.log(`Error on ${name}: ${e.message.substring(0, 60)}`);
        }
    }

    console.log("\nSync complete");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
