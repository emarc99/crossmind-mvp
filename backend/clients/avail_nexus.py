"""
Avail Nexus Client - Backend Wrapper
Handles real cross-chain token bridging via Avail Nexus
Integrates with MeTTa-based route optimization from autonomous agents
"""

import logging
import hashlib
import httpx
from typing import Dict, Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)

# Supported chains
SUPPORTED_CHAINS = {
    "sepolia": {"id": 11155111, "name": "Sepolia", "symbol": "ETH", "decimals": 18},
    "polygon-amoy": {"id": 80002, "name": "Polygon Amoy", "symbol": "MATIC", "decimals": 18},
    "ethereum": {"id": 1, "name": "Ethereum", "symbol": "ETH", "decimals": 18},
    "polygon": {"id": 137, "name": "Polygon", "symbol": "MATIC", "decimals": 18},
    "arbitrum": {"id": 42161, "name": "Arbitrum", "symbol": "ARB", "decimals": 18},
    "optimism": {"id": 10, "name": "Optimism", "symbol": "OP", "decimals": 18},
    "base": {"id": 8453, "name": "Base", "symbol": "BASE", "decimals": 18},
}

# Supported tokens
SUPPORTED_TOKENS = {
    "USDC": {"decimals": 6},
    "USDT": {"decimals": 6},
    "ETH": {"decimals": 18},
    "WETH": {"decimals": 18},
}

# Fee estimates
FEE_CONFIG = {
    "bridge_fee_percent": 0.05,  # 0.05% bridge fee
    "relayer_fee_usd": 0.5,
    "gas_estimates": {
        "sepolia": {"bridge": 5.0, "swap": 2.0},
        "polygon": {"bridge": 1.0, "swap": 0.25},
        "ethereum": {"bridge": 50.0, "swap": 25.0},
        "arbitrum": {"bridge": 5.0, "swap": 2.0},
        "optimism": {"bridge": 3.0, "swap": 1.0},
        "base": {"bridge": 3.0, "swap": 1.0},
    },
}


class AvailNexusClient:
    """Client for executing real cross-chain bridges via Avail Nexus."""

    def __init__(
        self,
        network: str = "testnet",
        api_base_url: Optional[str] = None,
        api_key: Optional[str] = None,
    ):
        self.network = network
        self.api_key = api_key

        if api_base_url:
            self.api_base_url = api_base_url
        elif network == "testnet":
            # VectorX Bridge API (the real underlying Avail bridge API)
            self.api_base_url = "https://turing-bridge-api.avail.so"
        else:
            # Mainnet VectorX Bridge API
            self.api_base_url = "https://bridge-api.avail.so"

        logger.info(f"Initialized Avail VectorX Bridge Client for {network} network")

    def _validate_chain(self, chain: str) -> bool:
        """Check if chain is supported."""
        return chain.lower() in SUPPORTED_CHAINS

    def _validate_token(self, token: str) -> bool:
        """Check if token is supported."""
        return token.upper() in SUPPORTED_TOKENS

    def _get_gas_estimate(self, chain: str, operation: str) -> float:
        """Get gas cost estimate for an operation."""
        chain_lower = chain.lower()
        return FEE_CONFIG["gas_estimates"].get(chain_lower, {}).get(operation, 1.0)

    async def get_bridge_quote(
        self,
        from_chain: str,
        to_chain: str,
        token: str,
        amount: float,
    ) -> Dict:
        """
        Get a bridge quote from Avail Nexus.

        Args:
            from_chain: Source chain (e.g., 'sepolia')
            to_chain: Destination chain (e.g., 'polygon-amoy')
            token: Token symbol (e.g., 'USDC')
            amount: Amount to bridge

        Returns:
            Dict with quote details and output amount
        """
        # Validation
        if not self._validate_chain(from_chain):
            return {"error": f"Chain {from_chain} is not supported"}
        if not self._validate_chain(to_chain):
            return {"error": f"Chain {to_chain} is not supported"}
        if not self._validate_token(token):
            return {"error": f"Token {token} is not supported"}
        if amount <= 0:
            return {"error": "Amount must be greater than 0"}

        try:
            # Note: Avail Nexus SDK (frontend) computes quotes, not VectorX Bridge API
            # Backend provides estimated quotes for agent recommendations only
            output_amount = amount * 0.995  # 0.5% estimated slippage
            gas_cost = self._get_gas_estimate(from_chain, "bridge")

            logger.info(f"Generated estimated quote: {from_chain} → {to_chain}, {amount} {token}")

            return {
                "quote_id": hashlib.sha256(f"{from_chain}{to_chain}{token}{amount}".encode()).hexdigest()[:32],
                "status": "success",
                "from_chain": from_chain,
                "to_chain": to_chain,
                "token": token.upper(),
                "amount": amount,
                "output_amount": output_amount,
                "gas_cost_usd": gas_cost,
                "bridge_fee_percent": FEE_CONFIG["bridge_fee_percent"],
                "estimated_time_minutes": 10,
                "note": "Estimated quote for agent recommendations. Actual quote computed by Nexus SDK.",
            }

        except Exception as e:
            logger.error(f"Error generating quote estimate: {e}")
            return {"error": str(e)}

    async def execute_bridge(
        self,
        quote_id: str,
        from_chain: str,
        to_chain: str,
        token: str,
        amount: float,
        recipient_address: str,
        signed_tx_data: str,
    ) -> Dict:
        """
        Execute a bridge transaction with user's signed transaction data.

        Args:
            quote_id: Quote ID from bridge quote
            from_chain: Source chain
            to_chain: Destination chain
            token: Token symbol
            amount: Amount to bridge
            recipient_address: Recipient address on destination chain
            signed_tx_data: User's signed transaction data

        Returns:
            Dict with transaction hash and status
        """
        if not all([quote_id, from_chain, to_chain, token, recipient_address, signed_tx_data]):
            return {"error": "Missing required parameters"}

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.api_base_url}/bridge/execute",
                    json={
                        "quoteId": quote_id,
                        "fromChainId": SUPPORTED_CHAINS[from_chain.lower()]["id"],
                        "toChainId": SUPPORTED_CHAINS[to_chain.lower()]["id"],
                        "token": token.upper(),
                        "amount": str(int(amount * (10 ** SUPPORTED_TOKENS[token.upper()]["decimals"]))),
                        "recipient": recipient_address,
                        "signedTxData": signed_tx_data,
                    },
                    headers={"X-API-Key": self.api_key} if self.api_key else {},
                )

                if response.status_code == 200:
                    data = response.json()
                    tx_hash = data.get("txHash")
                    logger.info(f"Bridge transaction executed: {tx_hash}")

                    return {
                        "status": "success",
                        "action": "bridge",
                        "tx_hash": tx_hash,
                        "quote_id": quote_id,
                        "from_chain": from_chain,
                        "to_chain": to_chain,
                        "token": token.upper(),
                        "amount": amount,
                        "gas_cost_usd": data.get("gasCost", self._get_gas_estimate(from_chain, "bridge")),
                        "estimated_time_minutes": data.get("estimatedTime", 10),
                        "blockscout_url": self._get_blockscout_url(from_chain, tx_hash),
                    }
                else:
                    logger.error(f"Bridge execution failed: {response.status_code}")
                    return {"error": f"Bridge execution failed: {response.status_code}"}

        except Exception as e:
            logger.error(f"Error executing bridge: {e}")
            return {"error": str(e)}

    async def check_bridge_status(
        self, tx_hash: str, from_chain: str, to_chain: str
    ) -> Dict:
        """
        Check the status of an ongoing bridge transaction.

        Args:
            tx_hash: Transaction hash from source chain
            from_chain: Source chain
            to_chain: Destination chain

        Returns:
            Dict with current bridge status and progress
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.api_base_url}/bridge/status",
                    params={
                        "txHash": tx_hash,
                        "fromChainId": SUPPORTED_CHAINS[from_chain.lower()]["id"],
                        "toChainId": SUPPORTED_CHAINS[to_chain.lower()]["id"],
                    },
                    headers={"X-API-Key": self.api_key} if self.api_key else {},
                )

                if response.status_code == 200:
                    data = response.json()
                    return {
                        "status": "success",
                        "source_tx": tx_hash,
                        "source_chain": from_chain,
                        "source_status": data.get("sourceStatus", "pending"),
                        "dest_chain": to_chain,
                        "dest_tx": data.get("destTx"),
                        "dest_status": data.get("destStatus", "pending"),
                        "overall_status": data.get("overallStatus", "bridging"),
                        "progress": data.get("progress", 50),
                        "estimated_time_remaining_minutes": data.get("estimatedTimeRemaining", 5),
                    }
                else:
                    logger.error(f"Status check failed: {response.status_code}")
                    return {"error": f"Status check failed: {response.status_code}"}

        except Exception as e:
            logger.error(f"Error checking bridge status: {e}")
            return {"error": str(e)}

    def _get_blockscout_url(self, chain: str, tx_hash: str) -> str:
        """Get Blockscout/Etherscan URL for a transaction."""
        explorers = {
            "ethereum": "https://etherscan.io/tx/",
            "sepolia": "https://sepolia.etherscan.io/tx/",
            "polygon": "https://polygonscan.com/tx/",
            "polygon-amoy": "https://amoy.polygonscan.com/tx/",
            "arbitrum": "https://arbiscan.io/tx/",
            "optimism": "https://optimistic.etherscan.io/tx/",
            "base": "https://basescan.org/tx/",
        }

        base_url = explorers.get(chain.lower(), "https://blockscout.com/tx/")
        return f"{base_url}{tx_hash}"
