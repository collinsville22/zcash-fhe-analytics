async function main() {
    console.log("Deploying ZcashFHEOracle...");

    const threshold = 3;

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const Oracle = await ethers.getContractFactory("ZcashFHEOracle");
    const oracle = await Oracle.deploy(threshold);

    // Wait for deployment to complete
    await oracle.waitForDeployment();

    const address = await oracle.getAddress();
    console.log("Oracle deployed to:", address);
    console.log("Threshold:", threshold);

    console.log("\nInitializing metrics...");

    let tx = await oracle.initializeMetric("total_volume");
    await tx.wait();
    console.log("Initialized: total_volume");

    tx = await oracle.initializeMetric("avg_fee");
    await tx.wait();
    console.log("Initialized: avg_fee");

    tx = await oracle.initializeMetric("tvl");
    await tx.wait();
    console.log("Initialized: tvl");

    console.log("\nDeployment complete!");
    console.log(`\nContract Address: ${address}`);
    console.log(`\nVerify with: npx hardhat verify --network sepolia ${address} ${threshold}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
