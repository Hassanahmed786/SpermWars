require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const rpc = process.env.MONAD_RPC_URL || process.env.NEXT_PUBLIC_MONAD_RPC_URL || "(unset)";
  console.log(`Using RPC: ${rpc}`);

  const entryFee = process.env.ENTRY_FEE || "0"; // wei
  const baseReward = process.env.BASE_REWARD || "1000000000000000"; // example default

  console.log("Compiling contracts...");
  await hre.run("compile");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const Factory = await hre.ethers.getContractFactory("SpermWarsMonad");
  const contract = await Factory.deploy(entryFee, baseReward);
  await contract.deployed();

  console.log("Deployed to:", contract.address);
  console.log("");
  console.log("Add this address to your .env as NEXT_PUBLIC_CONTRACT_ADDRESS=0x...");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
