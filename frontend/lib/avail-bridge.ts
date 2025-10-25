/**
 * Avail Bridge Contract Interface
 * Sepolia testnet integration for USDC bridging to Polygon Amoy
 */

// Sepolia testnet USDC token address
export const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

// Avail Bridge contract addresses (testnet)
export const AVAIL_BRIDGE_SEPOLIA = "0x5f1f4e97b9fcf347c2f7ca18937bf50cc9b9a2f9";

// ABIs
export const USDC_ABI = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const AVAIL_BRIDGE_ABI = [
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint32", name: "destinationChainId", type: "uint32" },
    ],
    name: "bridge",
    outputs: [{ internalType: "uint256", name: "bridgeId", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
] as const;

export interface BridgeParams {
  amount: bigint;
  recipient: string;
  destinationChainId: number; // 80002 for Polygon Amoy
  token: string; // USDC address on Sepolia
}

/**
 * Build bridge transaction for signing
 */
export function buildBridgeTransaction(params: BridgeParams) {
  return {
    to: AVAIL_BRIDGE_SEPOLIA,
    data: encodeBridgeCall(params),
    value: "0",
  };
}

/**
 * Encode bridge function call
 */
function encodeBridgeCall(params: BridgeParams): string {
  // This is a simplified version - in production would use viem's encodeAbiData
  const functionSelector = "0x12345678"; // Placeholder for bridge() function
  // Would need proper ABI encoding here

  return functionSelector;
}

/**
 * Calculate USDC amount with decimals (USDC has 6 decimals)
 */
export function parseUSDC(amount: number): bigint {
  return BigInt(Math.floor(amount * 1e6));
}

/**
 * Format USDC amount from raw value
 */
export function formatUSDC(amount: bigint): number {
  return Number(amount) / 1e6;
}
