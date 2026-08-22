require("dotenv").config();
require("@nomiclabs/hardhat-ethers");

module.exports = {
  solidity: "0.8.20",
  paths: {
    sources: "./contracts",
  },
  networks: {
    monad: {
      url: process.env.MONAD_RPC_URL || process.env.NEXT_PUBLIC_MONAD_RPC_URL || "",
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
      chainId: process.env.MONAD_CHAINID ? Number(process.env.MONAD_CHAINID) : undefined,
    },
  },
};
