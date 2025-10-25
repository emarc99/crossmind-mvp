"""
Avail Nexus Bridge Wrapper
Handles cross-chain bridging and swapping operations.
Wraps Avail Nexus SDK functionality for use in CrossMind.
"""

import logging
from typing import Dict, Optional, List
from decimal import Decimal

logger = logging.getLogger(__name__)

# Supported chains and their properties
SUPPORTED_CHAINS = {
    "ethereum": {"id": 1, "name": "Ethereum", "symbol": "ETH", "decimals": 18},
    "polygon": {"id": 137, "name": "Polygon", "symbol": "MATIC", "decimals": 18},
    "arbitrum": {"id": 42161, "name": "Arbitrum", "symbol": "ARB", "decimals": 18},
    "base": {"id": 8453, "name": "Base", "symbol": "BASE", "decimals": 18},
    "optimism": {"id": 10, "name": "Optimism", "symbol": "OP", "decimals": 18},
}

# Supported tokens with decimals
SUPPORTED_TOKENS = {
    "ETH": 18,
    "USDC": 6,
    "USDT": 6,
    "WETH": 18,
}

# Gas cost estimates (in USD) - these would be calculated dynamically in production
GAS_COSTS = {
    "ethereum": {"bridge": 50, "swap": 25},
    "polygon": {"bridge": 1, "swap": 0.25},
    "arbitrum": {"bridge": 5, "swap": 2},
    "base": {"bridge": 3, "swap": 1},
    "optimism": {"bridge": 3, "swap": 1},
}


class AvailBridgeClient:
    """Client for executing cross-chain bridges and swaps via Avail Nexus."""

    def __init__(self, network: str = "testnet"):
        self.network = network
        logger.info(f"Initialized Avail Bridge Client for {network}")

    def _validate_chain(self, chain: str) -> bool:
        """Check if chain is supported."""
        return chain.lower() in SUPPORTED_CHAINS

    def _validate_token(self, token: str) -> bool:
        """Check if token is supported."""
        return token.upper() in SUPPORTED_TOKENS

    def _get_decimals(self, token: str) -> int:
        """Get token decimals."""
        return SUPPORTED_TOKENS.get(token.upper(), 18)

    async def bridge_tokens(self, params: Dict) -> Dict:
        """
        Bridge tokens from one chain to another (same token).

        Args:
            params: {
                "from_chain": "ethereum",
                "to_chain": "polygon",
                "token": "USDC",
                "amount": 100.0,
                "recipient": "0x..." (optional)
            }

        Returns:
            Dict with transaction hash, status, and estimated time
        """
        from_chain = params.get("from_chain", "").lower()
        to_chain = params.get("to_chain", "").lower()
        token = params.get("token", "").upper()
        amount = float(params.get("amount", 0))

        # Validation
        if not self._validate_chain(from_chain):
            return {"error": f"Chain {from_chain} not supported"}
        if not self._validate_chain(to_chain):
            return {"error": f"Chain {to_chain} not supported"}
        if not self._validate_token(token):
            return {"error": f"Token {token} not supported"}
        if amount <= 0:
            return {"error": "Amount must be greater than 0"}

        # In production, this would call the actual Avail SDK
        # For MVP, we simulate the response
        decimals = self._get_decimals(token)
        from_chain_info = SUPPORTED_CHAINS[from_chain]
        to_chain_info = SUPPORTED_CHAINS[to_chain]

        # Estimate gas cost
        gas_cost = GAS_COSTS.get(from_chain, {}).get("bridge", 10)

        return {
            "status": "success",
            "action": "bridge",
            "from_chain": from_chain,
            "from_chain_name": from_chain_info["name"],
            "to_chain": to_chain,
            "to_chain_name": to_chain_info["name"],
            "token": token,
            "amount": amount,
            "output_amount": amount,  # Same token, same amount
            "tx_hash": "0x" + "a" * 64,  # Mock hash
            "gas_cost_usd": gas_cost,
            "estimated_time_minutes": 5,
            "estimated_blocks": 12,
        }

    async def swap_tokens(self, params: Dict) -> Dict:
        """
        Swap tokens on the same chain.

        Args:
            params: {
                "chain": "polygon",
                "from_token": "USDC",
                "to_token": "USDT",
                "amount": 100.0
            }

        Returns:
            Dict with transaction hash and output amount
        """
        chain = params.get("chain", "").lower()
        from_token = params.get("from_token", "").upper()
        to_token = params.get("to_token", "").upper()
        amount = float(params.get("amount", 0))

        # Validation
        if not self._validate_chain(chain):
            return {"error": f"Chain {chain} not supported"}
        if not self._validate_token(from_token):
            return {"error": f"Token {from_token} not supported"}
        if not self._validate_token(to_token):
            return {"error": f"Token {to_token} not supported"}
        if amount <= 0:
            return {"error": "Amount must be greater than 0"}

        # In production, would calculate actual output from DEX
        # For now, assume 0.2% slippage
        output_amount = amount * 0.998

        gas_cost = GAS_COSTS.get(chain, {}).get("swap", 1)

        return {
            "status": "success",
            "action": "swap",
            "chain": chain,
            "chain_name": SUPPORTED_CHAINS[chain]["name"],
            "from_token": from_token,
            "to_token": to_token,
            "input_amount": amount,
            "output_amount": round(output_amount, 6),
            "tx_hash": "0x" + "b" * 64,  # Mock hash
            "gas_cost_usd": gas_cost,
            "slippage_pct": 0.2,
        }

    async def bridge_and_swap(self, params: Dict) -> Dict:
        """
        Complex operation: Bridge tokens and swap on destination chain.

        Args:
            params: {
                "from_chain": "ethereum",
                "from_token": "USDC",
                "to_chain": "polygon",
                "to_token": "USDT",
                "amount": 100.0
            }

        Returns:
            Dict with transaction hashes and final output
        """
        from_chain = params.get("from_chain", "").lower()
        from_token = params.get("from_token", "").upper()
        to_chain = params.get("to_chain", "").lower()
        to_token = params.get("to_token", "").upper()
        amount = float(params.get("amount", 0))

        # Validation
        if not self._validate_chain(from_chain):
            return {"error": f"Chain {from_chain} not supported"}
        if not self._validate_chain(to_chain):
            return {"error": f"Chain {to_chain} not supported"}
        if not self._validate_token(from_token):
            return {"error": f"Token {from_token} not supported"}
        if not self._validate_token(to_token):
            return {"error": f"Token {to_token} not supported"}
        if amount <= 0:
            return {"error": "Amount must be greater than 0"}

        # Simulate bridge step
        bridge_gas = GAS_COSTS.get(from_chain, {}).get("bridge", 10)

        # After bridge, perform swap (0.2% slippage)
        swap_gas = GAS_COSTS.get(to_chain, {}).get("swap", 1)
        output_amount = amount * 0.998  # Bridge gives same amount, swap has slippage

        return {
            "status": "success",
            "action": "bridge_and_swap",
            "from_chain": from_chain,
            "from_chain_name": SUPPORTED_CHAINS[from_chain]["name"],
            "from_token": from_token,
            "to_chain": to_chain,
            "to_chain_name": SUPPORTED_CHAINS[to_chain]["name"],
            "to_token": to_token,
            "input_amount": amount,
            "output_amount": round(output_amount, 6),
            "bridge_tx_hash": "0x" + "c" * 64,  # Mock hash
            "swap_tx_hash": "0x" + "d" * 64,  # Mock hash
            "total_gas_cost_usd": bridge_gas + swap_gas,
            "bridge_gas_usd": bridge_gas,
            "swap_gas_usd": swap_gas,
            "estimated_total_time_minutes": 7,
            "steps": [
                {
                    "step": 1,
                    "action": "bridge",
                    "description": f"Bridge {amount} {from_token} from {SUPPORTED_CHAINS[from_chain]['name']}",
                    "estimated_time_minutes": 5
                },
                {
                    "step": 2,
                    "action": "swap",
                    "description": f"Swap {from_token} to {to_token} on {SUPPORTED_CHAINS[to_chain]['name']}",
                    "estimated_time_minutes": 1
                }
            ]
        }

    async def get_unified_balances(self, address: str) -> List[Dict]:
        """
        Get token balances across all chains for an address.

        Args:
            address: Wallet address

        Returns:
            List of balance objects across chains
        """
        # In production, would fetch actual balances
        # For MVP, return mock data
        mock_balances = [
            {
                "chain": "ethereum",
                "chain_name": "Ethereum",
                "token": "USDC",
                "balance": 150.00,
                "price_usd": 1.00,
                "value_usd": 150.00
            },
            {
                "chain": "ethereum",
                "chain_name": "Ethereum",
                "token": "ETH",
                "balance": 0.5,
                "price_usd": 3500.00,
                "value_usd": 1750.00
            },
            {
                "chain": "polygon",
                "chain_name": "Polygon",
                "token": "USDC",
                "balance": 100.00,
                "price_usd": 1.00,
                "value_usd": 100.00
            },
            {
                "chain": "polygon",
                "chain_name": "Polygon",
                "token": "USDT",
                "balance": 50.00,
                "price_usd": 0.998,
                "value_usd": 49.90
            },
            {
                "chain": "arbitrum",
                "chain_name": "Arbitrum",
                "token": "USDC",
                "balance": 25.00,
                "price_usd": 1.00,
                "value_usd": 25.00
            },
        ]

        return mock_balances

    async def check_bridge_status(self, tx_hash: str, from_chain: str, to_chain: str) -> Dict:
        """
        Check the status of a bridge transaction.

        Args:
            tx_hash: Transaction hash
            from_chain: Source chain
            to_chain: Destination chain

        Returns:
            Dict with status, progress, and estimated time remaining
        """
        # In production, would check actual Blockscout API
        # For MVP, return mock data
        return {
            "source_tx": tx_hash,
            "source_chain": from_chain,
            "source_status": "confirmed",
            "dest_chain": to_chain,
            "dest_tx": "0x" + "e" * 64,
            "dest_status": "pending",
            "overall_status": "bridging",
            "progress": 45,
            "estimated_time_remaining_minutes": 3,
            "confirmations": "8/12"
        }


async def test_avail_integration():
    """Test the Avail integration."""
    print("\n" + "="*60)
    print("🧪 Testing Avail Bridge Integration")
    print("="*60)

    client = AvailBridgeClient()

    # Test 1: Simple Bridge
    print("\n📊 Test 1: Simple Bridge")
    bridge_result = await client.bridge_tokens({
        "from_chain": "ethereum",
        "to_chain": "polygon",
        "token": "USDC",
        "amount": 10.0
    })

    if "error" not in bridge_result:
        print(f"✅ Bridge {bridge_result['amount']} {bridge_result['token']}")
        print(f"   From: {bridge_result['from_chain_name']}")
        print(f"   To: {bridge_result['to_chain_name']}")
        print(f"   Gas: ${bridge_result['gas_cost_usd']}")
        print(f"   Time: ~{bridge_result['estimated_time_minutes']} minutes")
    else:
        print(f"❌ Error: {bridge_result['error']}")

    # Test 2: Simple Swap
    print("\n📊 Test 2: Simple Swap")
    swap_result = await client.swap_tokens({
        "chain": "polygon",
        "from_token": "USDC",
        "to_token": "USDT",
        "amount": 10.0
    })

    if "error" not in swap_result:
        print(f"✅ Swap {swap_result['input_amount']} {swap_result['from_token']}")
        print(f"   To: {swap_result['output_amount']} {swap_result['to_token']}")
        print(f"   Gas: ${swap_result['gas_cost_usd']}")
        print(f"   Slippage: {swap_result['slippage_pct']}%")
    else:
        print(f"❌ Error: {swap_result['error']}")

    # Test 3: Bridge + Swap
    print("\n📊 Test 3: Bridge + Swap")
    complex_result = await client.bridge_and_swap({
        "from_chain": "ethereum",
        "from_token": "USDC",
        "to_chain": "polygon",
        "to_token": "USDT",
        "amount": 100.0
    })

    if "error" not in complex_result:
        print(f"✅ Start: {complex_result['input_amount']} {complex_result['from_token']}")
        print(f"   End: {complex_result['output_amount']} {complex_result['to_token']}")
        print(f"   Route: {complex_result['from_chain_name']} → {complex_result['to_chain_name']}")
        print(f"   Gas: ${complex_result['total_gas_cost_usd']}")
        print(f"   Time: ~{complex_result['estimated_total_time_minutes']} minutes")
    else:
        print(f"❌ Error: {complex_result['error']}")

    print("\n✅ Avail integration test complete!\n")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_avail_integration())
