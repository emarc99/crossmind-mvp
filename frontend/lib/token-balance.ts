/**
 * Token balance checking utilities
 * Fetches USDC balance from Sepolia testnet
 * Uses multiple RPC providers as fallback
 */

// Sepolia RPC endpoints (multiple free providers for redundancy)
const SEPOLIA_RPCS = [
  "https://rpc.sepolia.org", // Official Sepolia RPC (free, no auth required)
  "https://sepolia.drpc.org", // DRPC free tier
  "https://sepolia-rpc.com", // Chainstack free RPC
  "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161", // Infura (may be rate limited)
];

// USDC contracts on Sepolia (try both standard and mock)
export const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
export const SEPOLIA_USDC_MOCK = "0x8b0180f2c6c95b49f0A44f4FCF6dB4aa1eb6f6d9";

// ERC20 balanceOf function selector
// Function: balanceOf(address account) -> uint256
const BALANCE_OF_SELECTOR = "0x70a08231";

/**
 * Encode balanceOf function call
 */
function encodeBalanceOf(address: string): string {
  const paddedAddress = address.toLowerCase().replace("0x", "").padStart(64, "0");
  return BALANCE_OF_SELECTOR + paddedAddress;
}

/**
 * Fetch USDC balance for an address on Sepolia
 * Tries both standard and mock USDC contracts
 */
export async function getUSDCBalance(userAddress: string): Promise<number> {
  try {
    if (!userAddress) {
      return 0;
    }

    // Try standard USDC first
    let balance = await fetchTokenBalance(SEPOLIA_USDC, userAddress, 6);

    if (balance > 0) {
      console.log(`Balance from standard USDC: ${balance}`);
      return balance;
    }

    // Try mock USDC if standard returns 0
    balance = await fetchTokenBalance(SEPOLIA_USDC_MOCK, userAddress, 6);

    if (balance > 0) {
      console.log(`Balance from mock USDC: ${balance}`);
      return balance;
    }

    return 0;
  } catch (error) {
    console.error("Error fetching USDC balance:", error);
    return 0;
  }
}

/**
 * Fetch balance for a specific token contract
 * Tries multiple RPC providers in order
 */
async function fetchTokenBalance(
  tokenAddress: string,
  userAddress: string,
  decimals: number
): Promise<number> {
  const callData = encodeBalanceOf(userAddress);

  // Try each RPC provider in order
  for (const rpcUrl of SEPOLIA_RPCS) {
    try {
      console.log(`Trying RPC: ${rpcUrl.split("/").pop()}...`);

      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_call",
          params: [
            {
              to: tokenAddress,
              data: callData,
            },
            "latest",
          ],
          id: 1,
        }),
      });

      const data = await response.json();

      if (data.error) {
        console.warn(`RPC error from ${rpcUrl}:`, data.error.message);
        continue; // Try next RPC
      }

      if (!data.result || data.result === "0x") {
        return 0;
      }

      // Convert hex result to decimal
      const balanceWei = BigInt(data.result);
      const balance = Number(balanceWei) / Math.pow(10, decimals);

      console.log(`Success! Balance from ${rpcUrl}: ${balance}`);
      return balance;
    } catch (error) {
      console.warn(`Error fetching from ${rpcUrl}:`, error);
      continue; // Try next RPC
    }
  }

  console.error(`All RPC providers failed for ${tokenAddress}`);
  return 0;
}

/**
 * Format balance for display
 */
export function formatBalance(balance: number): string {
  if (balance === 0) {
    return "0.00";
  }

  if (balance < 0.01) {
    return balance.toFixed(6);
  }

  return balance.toFixed(2);
}
