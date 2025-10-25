/**
 * Wagmi Configuration
 * Sets up Web3 wallet connections with MetaMask, WalletConnect, and Coinbase Wallet
 * Supports both mainnet and Sepolia testnet
 */

import { createConfig, http } from "wagmi";
import {
  mainnet,
  polygon,
  arbitrum,
  base,
  optimism,
  sepolia,
  polygonAmoy,
  arbitrumSepolia,
  baseSepolia,
  optimismSepolia,
} from "wagmi/chains";

// Environment detection
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || "testnet";
const IS_TESTNET = ENVIRONMENT === "testnet";

// Create the wagmi config with appropriate chains
const chains = IS_TESTNET
  ? [sepolia, polygonAmoy, arbitrumSepolia, baseSepolia, optimismSepolia]
  : [mainnet, polygon, arbitrum, base, optimism];

const transports = IS_TESTNET
  ? {
      [sepolia.id]: http(),
      [polygonAmoy.id]: http(),
      [arbitrumSepolia.id]: http(),
      [baseSepolia.id]: http(),
      [optimismSepolia.id]: http(),
    }
  : {
      [mainnet.id]: http(),
      [polygon.id]: http(),
      [arbitrum.id]: http(),
      [base.id]: http(),
      [optimism.id]: http(),
    };

export const config = createConfig({
  chains,
  transports,
});

// Chain configuration - Mainnet
export const MAINNET_CHAINS = {
  ethereum: { id: 1, name: "Ethereum", symbol: "ETH" },
  polygon: { id: 137, name: "Polygon", symbol: "MATIC" },
  arbitrum: { id: 42161, name: "Arbitrum", symbol: "ARB" },
  base: { id: 8453, name: "Base", symbol: "BASE" },
  optimism: { id: 10, name: "Optimism", symbol: "OP" },
};

// Chain configuration - Testnet (Sepolia)
export const TESTNET_CHAINS = {
  sepolia: { id: 11155111, name: "Sepolia", symbol: "ETH" },
  polygonAmoy: { id: 80002, name: "Polygon Amoy", symbol: "MATIC" },
  arbitrumSepolia: { id: 421614, name: "Arbitrum Sepolia", symbol: "ARB" },
  baseSepolia: { id: 84532, name: "Base Sepolia", symbol: "BASE" },
  optimismSepolia: { id: 11155420, name: "Optimism Sepolia", symbol: "OP" },
};

// Export appropriate chains based on environment
export const SUPPORTED_CHAINS = IS_TESTNET ? TESTNET_CHAINS : MAINNET_CHAINS;
export const ENVIRONMENT_NAME = IS_TESTNET ? "Testnet (Sepolia)" : "Mainnet";
