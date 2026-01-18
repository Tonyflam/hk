import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    "cronos-testnet": {
      url: "https://evm-t3.cronos.org",
      chainId: 338,
      accounts: [PRIVATE_KEY],
      gasPrice: 10000000000000 // 10000 Gwei for testnet
    },
    "cronos-mainnet": {
      url: "https://evm.cronos.org",
      chainId: 25,
      accounts: [PRIVATE_KEY]
    }
  },
  etherscan: {
    apiKey: {
      cronosTestnet: process.env.CRONOS_API_KEY || "",
      cronos: process.env.CRONOS_API_KEY || ""
    },
    customChains: [
      {
        network: "cronosTestnet",
        chainId: 338,
        urls: {
          apiURL: "https://explorer-api.cronos.org/testnet/api",
          browserURL: "https://explorer.cronos.org/testnet"
        }
      },
      {
        network: "cronos",
        chainId: 25,
        urls: {
          apiURL: "https://explorer-api.cronos.org/mainnet/api",
          browserURL: "https://explorer.cronos.org"
        }
      }
    ]
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

export default config;
