"""
Pyth Network Price Fetcher
Provides real-time institutional-grade price feeds for token pairs.
Uses Pyth Hermes API: https://hermes.pyth.network/
"""

import asyncio
import httpx
import logging
from typing import Dict, Optional, List
from decimal import Decimal

logger = logging.getLogger(__name__)

# Pyth feed IDs for common trading pairs (without "0x" prefix for Hermes API)
PYTH_FEED_IDS = {
    "BTC/USD": "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
    "ETH/USD": "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
    "USDC/USD": "eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
    "USDT/USD": "2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0d151d927e70ca34de6",
    "SOL/USD": "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
    "MATIC/USD": "5de33a9112c5b465546021b6b2d3a4c0ecc7b25c9f32976b745d20ba8fe822ea",
    "ARB/USD": "3fa4252848f28f69666d5604d2e3cb0d3d713c0ef282074d6f87d6310d92078a",
    "WETH/USD": "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
}

class PythPriceFetcher:
    """Fetch real-time prices from Pyth Network."""

    def __init__(self, hermes_url: str = "https://hermes.pyth.network"):
        self.hermes_url = hermes_url
        self.endpoint = f"{hermes_url}/v2/updates/price/latest"

    async def fetch_price(self, symbol: str) -> Optional[Dict]:
        """
        Fetch current price for a single symbol.

        Args:
            symbol: Trading pair (e.g., "BTC/USD", "ETH/USD")

        Returns:
            Dict with price, confidence, timestamp, or None if error
        """
        if symbol not in PYTH_FEED_IDS:
            logger.error(f"Unknown symbol: {symbol}")
            return None

        feed_id = PYTH_FEED_IDS[symbol]

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    self.endpoint,
                    params={"ids[]": feed_id, "parsed": "true"}
                )
                response.raise_for_status()
                data = response.json()

                if data.get("parsed") and len(data["parsed"]) > 0:
                    return self._parse_price_data(data["parsed"][0], symbol)

        except Exception as e:
            logger.error(f"Error fetching price for {symbol}: {e}")

        return None

    async def fetch_multiple_prices(self, symbols: List[str]) -> Dict[str, Dict]:
        """
        Fetch prices for multiple symbols concurrently.

        Args:
            symbols: List of trading pairs

        Returns:
            Dict mapping symbol to price data
        """
        tasks = [self.fetch_price(symbol) for symbol in symbols]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        prices = {}
        for symbol, result in zip(symbols, results):
            if isinstance(result, dict):
                prices[symbol] = result
            elif result is not None:
                logger.warning(f"Failed to fetch {symbol}: {result}")

        return prices

    def _parse_price_data(self, data: Dict, symbol: str) -> Optional[Dict]:
        """
        Parse Pyth API response and extract price information.

        Args:
            data: Raw price data from Pyth API
            symbol: Trading pair symbol

        Returns:
            Dict with formatted price data or None
        """
        try:
            price_data = data.get("price")
            if not price_data:
                return None

            # Extract raw values
            price_raw = float(price_data.get("price", 0))
            conf_raw = float(price_data.get("conf", 0))
            expo = int(price_data.get("expo", 0))

            # Calculate actual price using exponent
            multiplier = 10 ** expo
            price = price_raw * multiplier
            confidence = conf_raw * multiplier

            # Calculate confidence percentage
            confidence_pct = (confidence / price * 100) if price > 0 else 0

            return {
                "symbol": symbol,
                "price": round(price, 8),
                "confidence": round(confidence, 8),
                "confidence_pct": round(confidence_pct, 4),
                "timestamp": data.get("publish_time", 0),
                "status": "success"
            }

        except Exception as e:
            logger.error(f"Error parsing price data for {symbol}: {e}")
            return None

    async def calculate_swap_rate(
        self,
        from_token: str,
        to_token: str,
        amount: float
    ) -> Dict:
        """
        Calculate swap rate and output amount between two tokens.

        Args:
            from_token: Source token (e.g., "USDC")
            to_token: Destination token (e.g., "USDT")
            amount: Input amount

        Returns:
            Dict with exchange rate, output amount, price impact, confidence
        """
        from_symbol = f"{from_token}/USD"
        to_symbol = f"{to_token}/USD"

        # Fetch both prices
        prices = await self.fetch_multiple_prices([from_symbol, to_symbol])

        if from_symbol not in prices or to_symbol not in prices:
            return {
                "error": "Could not fetch prices",
                "from_token": from_token,
                "to_token": to_token,
                "amount": amount
            }

        from_price = prices[from_symbol]["price"]
        to_price = prices[to_symbol]["price"]

        # Calculate exchange rate and output
        exchange_rate = from_price / to_price
        output_amount = amount * exchange_rate

        # Estimate price impact (simplified - in production would use pool data)
        price_impact = 0.1  # 0.1% default for DEX swaps

        # Min confidence from both prices
        min_confidence_pct = min(
            prices[from_symbol]["confidence_pct"],
            prices[to_symbol]["confidence_pct"]
        )

        return {
            "from_token": from_token,
            "to_token": to_token,
            "input_amount": amount,
            "output_amount": round(output_amount, 8),
            "exchange_rate": round(exchange_rate, 8),
            "price_impact": price_impact,
            "confidence_pct": round(min_confidence_pct, 4),
            "from_price": from_price,
            "to_price": to_price,
            "status": "success"
        }


async def test_pyth_integration():
    """Test the Pyth integration."""
    print("\n" + "="*60)
    print("🧪 Testing Pyth Network Integration")
    print("="*60)

    fetcher = PythPriceFetcher()

    # Test 1: Fetch single prices
    print("\n📊 Fetching individual prices...")
    symbols = ["BTC/USD", "ETH/USD", "USDC/USD", "USDT/USD"]
    prices = await fetcher.fetch_multiple_prices(symbols)

    for symbol, data in prices.items():
        if data:
            print(f"✅ {symbol}: ${data['price']:.2f} (±{data['confidence_pct']:.4f}%)")
        else:
            print(f"❌ {symbol}: Failed to fetch")

    # Test 2: Calculate swap rate
    print("\n💱 Testing swap rate calculation...")
    print("Scenario: Swap 100 USDC for USDT")

    swap_result = await fetcher.calculate_swap_rate("USDC", "USDT", 100)

    if "error" not in swap_result:
        print(f"✅ Input: {swap_result['input_amount']} {swap_result['from_token']}")
        print(f"✅ Output: {swap_result['output_amount']} {swap_result['to_token']}")
        print(f"✅ Rate: {swap_result['exchange_rate']:.8f} {to_token}/{from_token}")
        print(f"✅ Price Impact: {swap_result['price_impact']:.2f}%")
        print(f"✅ Confidence: {swap_result['confidence_pct']:.4f}%")
    else:
        print(f"❌ Error: {swap_result['error']}")

    print("\n✅ Pyth integration test complete!\n")


if __name__ == "__main__":
    asyncio.run(test_pyth_integration())
