const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts...");

  // Deploy OCOSO Token
  const OCOSOToken = await hre.ethers.getContractFactory("OCOSOToken");
  const ocosoToken = await OCOSOToken.deploy();
  await ocosoToken.waitForDeployment();
  console.log("OCOSO Token deployed to:", await ocosoToken.getAddress());

  // Deploy OcosoNFTStaking
  const OcosoNFTStaking = await hre.ethers.getContractFactory("OcosoNFTStaking");
  const nftContractAddress = "YOUR_NFT_CONTRACT_ADDRESS"; // Replace with your NFT contract address
  const ocosoNFTStaking = await OcosoNFTStaking.deploy(
    nftContractAddress,
    await ocosoToken.getAddress()
  );
  await ocosoNFTStaking.waitForDeployment();
  console.log("OcosoNFTStaking deployed to:", await ocosoNFTStaking.getAddress());

  // Transfer some tokens to the staking contract for rewards
  const amount = hre.ethers.parseEther("100000"); // 100,000 tokens
  await ocosoToken.transfer(await ocosoNFTStaking.getAddress(), amount);
  console.log("Transferred 100,000 OCOSO tokens to staking contract");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 