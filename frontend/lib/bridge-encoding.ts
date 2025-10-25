/**
 * Bridge transaction encoding utilities
 * Encodes function calls for Avail bridge contract on Sepolia
 */

// Sepolia addresses
export const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
export const AVAIL_BRIDGE_SEPOLIA = "0x5f1f4e97b9fcf347c2f7ca18937bf50cc9b9a2f9";

// Chain IDs
export const SEPOLIA_CHAIN_ID = 11155111;
export const POLYGON_AMOY_CHAIN_ID = 80002;

/**
 * Encode USDC approve function call
 * Function: approve(address spender, uint256 amount)
 */
export function encodeUSDCApprove(bridgeAddress: string, amount: bigint): string {
  // Function selector for approve(address,uint256)
  const selector = "0x095ea7b3";

  // Pad address to 32 bytes
  const paddedBridge = bridgeAddress.toLowerCase().replace("0x", "").padStart(64, "0");

  // Pad amount to 32 bytes
  const paddedAmount = amount.toString(16).padStart(64, "0");

  return selector + paddedBridge + paddedAmount;
}

/**
 * Encode bridge function call
 * Real Avail Nexus bridge: bridgeWithMetadata(address token, uint256 amount, address recipient, uint256 destinationChainId, bytes metadata)
 */
export function encodeBridgeCall(
  tokenAddress: string,
  amount: bigint,
  recipient: string,
  destinationChainId: number
): string {
  // Real Avail Nexus bridge function selector
  // keccak256("bridgeWithMetadata(address,uint256,address,uint256,bytes)") = 0x8c1d3b74
  const selector = "0x8c1d3b74";

  // Solidity ABI encoding
  const paddedToken = tokenAddress.toLowerCase().replace("0x", "").padStart(64, "0");
  const paddedAmount = amount.toString(16).padStart(64, "0");
  const paddedRecipient = recipient.toLowerCase().replace("0x", "").padStart(64, "0");
  const paddedChainId = destinationChainId.toString(16).padStart(64, "0");

  // Empty metadata: offset 160 (0xa0), length 0
  const metadataOffset = "00000000000000000000000000000000000000000000000000000000000000a0";
  const metadataLength = "0000000000000000000000000000000000000000000000000000000000000000";

  return selector + paddedToken + paddedAmount + paddedRecipient + paddedChainId + metadataOffset + metadataLength;
}

/**
 * Parse USDC amount (6 decimals)
 * Example: 100 USDC -> 100000000n
 */
export function parseUSDC(amount: number): bigint {
  return BigInt(Math.floor(amount * 1e6));
}

/**
 * Build approval transaction
 * User must approve USDC spending before bridge
 */
export function buildApprovalTx(amount: bigint): {
  to: string;
  data: string;
  value: string;
  gas: string;
} {
  return {
    to: SEPOLIA_USDC,
    data: encodeUSDCApprove(AVAIL_BRIDGE_SEPOLIA, amount),
    value: "0",
    gas: "0x5B8D80", // ~6M gas for approval
  };
}

/**
 * Build bridge transaction
 * Actual bridging call with amount and destination
 */
export function buildBridgeTx(amount: bigint, recipientAddress: string): {
  to: string;
  data: string;
  value: string;
  gas: string;
} {
  return {
    to: AVAIL_BRIDGE_SEPOLIA,
    data: encodeBridgeCall(SEPOLIA_USDC, amount, recipientAddress, POLYGON_AMOY_CHAIN_ID),
    value: "0",
    gas: "0xC8000", // ~800k gas for bridge
  };
}

/**
 * Check USDC balance on Sepolia
 * Note: This would require RPC call in production
 */
export async function checkUSDCBalance(
  userAddress: string,
  provider: any
): Promise<bigint> {
  try {
    // This is a simplified version
    // In production, use ethers.js or viem to call USDC balanceOf
    return BigInt(0);
  } catch (error) {
    console.error("Error checking USDC balance:", error);
    return BigInt(0);
  }
}
