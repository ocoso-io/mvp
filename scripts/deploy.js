const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting OcosoToken deployment to Sepolia...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("👤 Deploying contracts with the account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  console.log("📦 Deploying OcosoToken contract...");
  const OcosoToken = await hre.ethers.getContractFactory("OcosoToken");
  const ocosoToken = await OcosoToken.deploy();

  console.log("⏳ Waiting for deployment confirmation...");
  await ocosoToken.waitForDeployment();

  const tokenAddress = await ocosoToken.getAddress();
  console.log("✅ OcosoToken deployed to:", tokenAddress);
  console.log("👑 Owner set to:", deployer.address);

  // Verify contract on Etherscan
  if (hre.network.name === "sepolia") {
    console.log("⏳ Waiting for 5 block confirmations...");
    await ocosoToken.deploymentTransaction().wait(5);
    
    console.log("🔍 Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: tokenAddress,
        constructorArguments: []
      });
      console.log("✅ Contract verified successfully on Etherscan!");
    } catch (error) {
      console.error("❌ Verification failed:", error);
    }
  }

  console.log("🎉 Deployment completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 