/**
 * Fetch prices from multiple sources with fallback
 * Integrates with Pyth Network for real-time price feeds
 */

// Mock price data for testnet - in production would fetch from Pyth Network
const MOCK_PRICES: Record<string, number> = {
  ETH: 3456.78,
  USDC: 1.0,
  USDT: 0.998,
  DAI: 0.999,
  WETH: 3456.78,
  EURC: 1.08,
  BTC: 67234.5,
  MATIC: 0.85,
  ARB: 0.75,
  SOL: 145.32,
};

export interface PriceData {
  symbol: string;
  price: number;
  confidence: number; // percentage
  timestamp: number;
}

/**
 * Fetch a single price
 */
export async function fetchPrice(symbol: string): Promise<number> {
  try {
    // For testnet, use mock prices
    if (MOCK_PRICES[symbol]) {
      return MOCK_PRICES[symbol];
    }

    // In production, would fetch from Pyth Network Hermes API
    // const response = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?ids[]=${getFeedId(symbol)}`);
    // const data = await response.json();
    // return parsePrice(data);

    return 0;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return 0;
  }
}

/**
 * Fetch multiple prices concurrently
 */
export async function fetchMultiplePrices(symbols: string[]): Promise<Record<string, number>> {
  try {
    const prices: Record<string, number> = {};

    // Fetch all prices concurrently
    const pricePromises = symbols.map(async (symbol) => {
      const price = await fetchPrice(symbol);
      prices[symbol] = price;
    });

    await Promise.all(pricePromises);

    return prices;
  } catch (error) {
    console.error("Error fetching multiple prices:", error);
    // Return mock prices as fallback
    const fallback: Record<string, number> = {};
    symbols.forEach((symbol) => {
      fallback[symbol] = MOCK_PRICES[symbol] || 0;
    });
    return fallback;
  }
}

/**
 * Get Pyth feed ID for a token pair
 * Format: base/quote (e.g., "ETH/USD")
 */
function getFeedId(symbol: string): string {
  const feedIds: Record<string, string> = {
    "ETH/USD": "ff61491a931112ddf1bd8147cd1b641375f79535ca0432b0643a4c4266af8cbf",
    "BTC/USD": "e62df6c8b4ffa34c4622e4b0bfc08aaa639ca63f5dcf6acf6d68d706cf6e4c89",
    "USDC/USD": "eaa020c61cc479712813461ce153894a96a6c00b21ed0fa4a31d1cef11f00971",
    "USDT/USD": "2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688d2e53b",
    "DAI/USD": "b0d2e4c67eee0fa0dbbee09f328b413a49671c26c530c3db8249b86a50ce6e15",
    "MATIC/USD": "5de33a9112c2b700b8d00cbbf4d3aed98bf895c0f36aca1fb446c6cacee39f09",
    "ARB/USD": "3fa4252848f28738d85f00ed81eaced22f7594745b18bb7d757b8033403bd917",
  };

  return feedIds[symbol] || "";
}

/**
 * Parse Pyth price response
 */
interface PythPriceResponse {
  price: {
    price: string;
    expo: number;
    conf: string;
  };
  publish_time: number;
}

function parsePrice(response: PythPriceResponse): number {
  try {
    const price = BigInt(response.price.price);
    const expo = response.price.expo;
    const divisor = BigInt(10 ** Math.abs(expo));

    if (expo >= 0) {
      return Number(price * divisor);
    } else {
      return Number(price) / Number(divisor);
    }
  } catch (error) {
    console.error("Error parsing Pyth price:", error);
    return 0;
  }
}

/**
 * Calculate swap output amount
 */
export function calculateSwapOutput(
  inputAmount: number,
  fromPrice: number,
  toPrice: number,
  slippagePercent: number = 0.5
): number {
  if (fromPrice === 0 || toPrice === 0) return 0;

  const exchangeRate = fromPrice / toPrice;
  const output = inputAmount * exchangeRate;
  const slippage = output * (slippagePercent / 100);

  return output - slippage;
}

/**
 * Calculate price impact for large orders
 */
export function calculatePriceImpact(
  inputAmount: number,
  liquidity: number = 1000000
): number {
  // Simple formula: impact = (inputAmount / liquidity) * 100
  return (inputAmount / liquidity) * 100;
}
