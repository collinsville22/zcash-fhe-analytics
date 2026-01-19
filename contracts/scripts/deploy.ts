import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying ZcashFHEAnalytics...");
  console.log("Network:", network.name);
  console.log("Deployer:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  const ZcashFHEAnalytics = await ethers.getContractFactory("ZcashFHEAnalytics");
  const analytics = await ZcashFHEAnalytics.deploy();

  await analytics.waitForDeployment();

  const address = await analytics.getAddress();
  console.log("ZcashFHEAnalytics deployed to:", address);

  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    await analytics.deploymentTransaction()?.wait(5);
    console.log("Confirmed");
  }

  console.log("\nDeployment complete");
  console.log("Contract address:", address);
  console.log("Owner:", deployer.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
