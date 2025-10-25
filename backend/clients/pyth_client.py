"""
Pyth Network Price Fetcher Client
Provides real-time price feeds for route optimization and risk assessment
"""

import logging
import httpx
from typing import Dict, Optional, List
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Pyth Network API endpoints
PYTH_MAINNET_API = "https://hermes.pyth.network"
PYTH_TESTNET_API = "https://hermes-beta.pyth.network"

# Common token/price feed IDs on Pyth
PRICE_FEED_IDS = {
    "ETH/USD": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
    "USDC/USD": "0xeaa020c61cc479712813461ce153894860f0e5f0ca85ed49b7e2e67b8797e46a",
    "USDT/USD": "0x2b89b9dc8fdf9f34709a5b106b472f0f39c7b9d5367127b5a1f8e6ab0d4b9a0b",
    "MATIC/USD": "0x5de33a9112c2b700b8d30eb2a3855297605454276a8527a0a8552c8b2efa4907",
    "ARB/USD": "0x3fa4252848f9f0a1480be6d6bac69a8a98f6134c73f278e37e8a9fc058e2db51",
    "OP/USD": "0x385f64d993f7b77d8182ed0407d71e6e68d5438e3fc33cbbd6860e47f91b7259",
    "BASE/USD": "0xaec1b38255c23046f0a23bb9caa1c5c53fb91310b4b1e3b52b8540cc7b866c6f",
}


class PythClient:
    """Client for fetching real-time prices from Pyth Network."""

    def __init__(self, network: str = "testnet"):
        self.network = network
        self.api_base_url = PYTH_TESTNET_API if network == "testnet" else PYTH_MAINNET_API
        self.price_cache: Dict[str, tuple[float, datetime]] = {}
        self.cache_ttl = 60  # Cache prices for 60 seconds

        logger.info(f"Initialized Pyth Client for {network} network")

    async def get_price(self, token: str, target_currency: str = "USD") -> Optional[float]:
        """
        Get current price for a token from Pyth Network.

        Args:
            token: Token symbol (e.g., 'ETH', 'USDC')
            target_currency: Target currency (default 'USD')

        Returns:
            Current price as float, or None if unavailable
        """
        price_key = f"{token}/{target_currency}"

        # Check cache first
        if price_key in self.price_cache:
            cached_price, cached_time = self.price_cache[price_key]
            if datetime.utcnow() - cached_time < timedelta(seconds=self.cache_ttl):
                return cached_price

        # Fetch from Pyth
        try:
            feed_id = PRICE_FEED_IDS.get(price_key)
            if not feed_id:
                logger.warning(f"No Pyth feed found for {price_key}")
                return None

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.api_base_url}/api/latest_price_feeds",
                    params={
                        "ids[]": feed_id,
                        "parsing": "pyth",
                    },
                )

                if response.status_code == 200:
                    data = response.json()
                    if data.get("parsed") and len(data["parsed"]) > 0:
                        price_data = data["parsed"][0]
                        # Extract price from Pyth response
                        price = float(price_data.get("price", {}).get("price", 0))

                        # Cache the price
                        self.price_cache[price_key] = (price, datetime.utcnow())

                        logger.info(f"Fetched {price_key} = ${price}")
                        return price

                logger.warning(f"Invalid response from Pyth: {response.status_code}")
                return None

        except Exception as e:
            logger.error(f"Error fetching price from Pyth: {e}")
            return None

    async def get_prices(self, tokens: List[str]) -> Dict[str, Optional[float]]:
        """
        Get prices for multiple tokens concurrently.

        Args:
            tokens: List of token symbols

        Returns:
            Dict mapping token symbols to prices
        """
        prices = {}

        try:
            feed_ids = [
                PRICE_FEED_IDS.get(f"{token}/USD")
                for token in tokens
                if f"{token}/USD" in PRICE_FEED_IDS
            ]

            if not feed_ids:
                return {token: None for token in tokens}

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.api_base_url}/api/latest_price_feeds",
                    params={
                        "ids[]": feed_ids,
                        "parsing": "pyth",
                    },
                )

                if response.status_code == 200:
                    data = response.json()
                    if data.get("parsed"):
                        for price_data in data["parsed"]:
                            # Parse token from feed ID
                            token = self._get_token_from_feed_id(price_data.get("id"))
                            if token:
                                price = float(price_data.get("price", {}).get("price", 0))
                                prices[token] = price
                                self.price_cache[f"{token}/USD"] = (price, datetime.utcnow())

        except Exception as e:
            logger.error(f"Error fetching multiple prices: {e}")

        # Fill in missing tokens with None
        for token in tokens:
            if token not in prices:
                prices[token] = None

        return prices

    async def calculate_swap_output(
        self, from_token: str, to_token: str, input_amount: float
    ) -> float:
        """
        Calculate estimated output amount for a swap given current prices.

        Args:
            from_token: Input token symbol
            to_token: Output token symbol
            input_amount: Input amount

        Returns:
            Estimated output amount
        """
        try:
            from_price = await self.get_price(from_token)
            to_price = await self.get_price(to_token)

            if from_price is None or to_price is None:
                logger.warning(f"Could not get prices for {from_token} or {to_token}")
                return input_amount * 0.998  # Assume 0.2% slippage

            # Calculate output: (input * input_price) / output_price
            output = (input_amount * from_price) / to_price

            # Account for slippage (0.2%)
            output *= 0.998

            return output

        except Exception as e:
            logger.error(f"Error calculating swap output: {e}")
            return input_amount * 0.998

    async def calculate_price_impact(
        self, from_token: str, to_token: str, input_amount: float
    ) -> float:
        """
        Calculate price impact percentage for a swap.

        Args:
            from_token: Input token
            to_token: Output token
            input_amount: Input amount

        Returns:
            Price impact as percentage (0-100)
        """
        try:
            output = await self.calculate_swap_output(from_token, to_token, input_amount)
            ideal_output = input_amount  # If both tokens had same price

            impact = ((ideal_output - output) / ideal_output) * 100
            return max(0, impact)

        except Exception as e:
            logger.error(f"Error calculating price impact: {e}")
            return 0.2  # Default to 0.2% impact

    def _get_token_from_feed_id(self, feed_id: str) -> Optional[str]:
        """Extract token symbol from Pyth feed ID."""
        for token_pair, stored_id in PRICE_FEED_IDS.items():
            if stored_id == feed_id:
                return token_pair.split("/")[0]
        return None

    def clear_cache(self):
        """Clear price cache."""
        self.price_cache.clear()
        logger.info("Price cache cleared")
