/**
 * Get all token balances for a wallet on Sepolia
 * Fetches from multiple RPC providers with automatic fallback
 */

// Known token contracts on Sepolia
const KNOWN_TOKENS: Record<string, { address: string; decimals: number; symbol: string }> = {
  USDC: {
    address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    decimals: 6,
    symbol: "USDC",
  },
  USDT: {
    address: "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
    decimals: 6,
    symbol: "USDT",
  },
  DAI: {
    address: "0xFF34B3d4Aee5D82176479E3514F4d01D5461cAC7",
    decimals: 18,
    symbol: "DAI",
  },
  WETH: {
    address: "0xfFf9976782d46CC05630D90f163f969Cb7e0f7c1",
    decimals: 18,
    symbol: "WETH",
  },
  EURC: {
    address: "0xC5fd3ced7E42EF88F2d6CF96b0d389b13afcb467",
    decimals: 6,
    symbol: "EURC",
  },
};

export interface TokenBalance {
  symbol: string;
  balance: number;
  address: string;
  decimals: number;
}

export interface WalletBalances {
  eth: number;
  tokens: TokenBalance[];
  totalTokens: number;
}

/**
 * Fetch all token balances for an address on Sepolia
 */
export async function getAllBalances(userAddress: string): Promise<WalletBalances> {
  try {
    if (!userAddress) {
      return {
        eth: 0,
        tokens: [],
        totalTokens: 0,
      };
    }

    // Fetch ETH balance
    const ethBalance = await getETHBalance(userAddress);

    // Fetch all token balances
    const tokenBalances: TokenBalance[] = [];

    for (const [symbol, tokenInfo] of Object.entries(KNOWN_TOKENS)) {
      const balance = await getTokenBalance(userAddress, tokenInfo.address, tokenInfo.decimals);

      if (balance > 0) {
        tokenBalances.push({
          symbol,
          balance,
          address: tokenInfo.address,
          decimals: tokenInfo.decimals,
        });
      }
    }

    return {
      eth: ethBalance,
      tokens: tokenBalances,
      totalTokens: tokenBalances.length,
    };
  } catch (error) {
    console.error("Error fetching all balances:", error);
    return {
      eth: 0,
      tokens: [],
      totalTokens: 0,
    };
  }
}

/**
 * Get ETH balance via RPC (more reliable than Etherscan API)
 */
async function getETHBalance(address: string): Promise<number> {
  try {
    // Use multiple RPC providers as fallback
    const rpcs = [
      "https://sepolia.drpc.org",
      "https://ethereum-sepolia-rpc.allthatnode.com:8545",
      "https://sepolia.publicnode.com",
    ];

    for (const rpc of rpcs) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(rpc, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_getBalance",
            params: [address, "latest"],
            id: 1,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        const data = await response.json();

        if (data.result) {
          // Convert Wei to ETH (18 decimals)
          const balanceWei = BigInt(data.result);
          return Number(balanceWei) / 1e18;
        }
      } catch (e) {
        // Try next RPC
        console.debug(`ETH balance fetch failed for RPC, trying next:`, e);
        continue;
      }
    }

    return 0;
  } catch (error) {
    console.error("Error fetching ETH balance:", error);
    return 0;
  }
}

/**
 * Get ERC20 token balance via RPC eth_call
 */
async function getTokenBalance(
  userAddress: string,
  tokenAddress: string,
  decimals: number
): Promise<number> {
  try {
    // Use multiple RPC providers as fallback - updated with working endpoints
    const rpcs = [
      "https://sepolia.drpc.org",
      "https://ethereum-sepolia-rpc.allthatnode.com:8545",
      "https://sepolia.publicnode.com",
    ];

    for (const rpc of rpcs) {
      try {
        const selector = "0x70a08231"; // balanceOf function selector
        const paddedAddress = userAddress.toLowerCase().replace("0x", "").padStart(64, "0");
        const callData = selector + paddedAddress;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(rpc, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
          signal: controller.signal,
        });

        clearTimeout(timeout);

        const data = await response.json();

        if (data.result && data.result !== "0x") {
          const balanceWei = BigInt(data.result);
          const balance = Number(balanceWei) / Math.pow(10, decimals);
          return balance;
        }
      } catch (e) {
        // Try next RPC
        console.debug(`RPC call failed for ${tokenAddress}, trying next endpoint:`, e);
        continue;
      }
    }

    return 0;
  } catch (error) {
    console.error(`Error fetching token balance for ${tokenAddress}:`, error);
    return 0;
  }
}

/**
 * Format balance for display
 */
export function formatTokenBalance(balance: number, decimals: number = 2): string {
  if (balance === 0) {
    return "0.00";
  }

  if (balance < 0.01) {
    return balance.toFixed(decimals + 4);
  }

  return balance.toFixed(decimals);
}
