"""
Blockscout Client for Multi-Chain Transaction Tracking
Provides unified interface for querying transaction data across different chains
"""

import logging
import httpx
from typing import Dict, Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)

# Blockscout API endpoints for different chains
BLOCKSCOUT_ENDPOINTS = {
    "ethereum": "https://eth.blockscout.com/api/v2",
    "sepolia": "https://eth-sepolia.blockscout.com/api/v2",
    "polygon": "https://polygon.blockscout.com/api/v2",
    "polygon-amoy": "https://amoy.polygonscan.com/api",
    "arbitrum": "https://arbitrum.blockscout.com/api/v2",
    "optimism": "https://optimism.blockscout.com/api/v2",
    "base": "https://base.blockscout.com/api/v2",
}

# Alternative Etherscan APIs as fallback
ETHERSCAN_ENDPOINTS = {
    "sepolia": "https://api-sepolia.etherscan.io/api",
    "ethereum": "https://api.etherscan.io/api",
}


class BlockscoutClient:
    """Client for querying transaction data from Blockscout/Etherscan."""

    def __init__(self, etherscan_api_key: Optional[str] = None):
        self.etherscan_api_key = etherscan_api_key
        logger.info("Initialized Blockscout Client")

    async def get_transaction(self, chain: str, tx_hash: str) -> Optional[Dict]:
        """
        Get transaction details from Blockscout.

        Args:
            chain: Chain name (e.g., 'sepolia', 'polygon')
            tx_hash: Transaction hash

        Returns:
            Dict with transaction details or None if not found
        """
        try:
            # Try Blockscout first
            endpoint = BLOCKSCOUT_ENDPOINTS.get(chain.lower())
            if endpoint:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(
                        f"{endpoint}/transactions/{tx_hash}",
                    )

                    if response.status_code == 200:
                        data = response.json()
                        return {
                            "tx_hash": tx_hash,
                            "chain": chain,
                            "status": data.get("status", "unknown"),
                            "from": data.get("from", {}).get("hash"),
                            "to": data.get("to", {}).get("hash"),
                            "value": data.get("value"),
                            "gas_used": data.get("gas_used"),
                            "gas_price": data.get("gas_price"),
                            "block_number": data.get("block_number"),
                            "timestamp": data.get("timestamp"),
                            "input": data.get("input"),
                            "method": data.get("method"),
                            "is_contract_interaction": data.get("type") in [
                                "token transfer",
                                "contract call",
                            ],
                        }

            # Fallback to Etherscan for testnet
            if chain.lower() in ETHERSCAN_ENDPOINTS and self.etherscan_api_key:
                etherscan_endpoint = ETHERSCAN_ENDPOINTS[chain.lower()]
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(
                        etherscan_endpoint,
                        params={
                            "module": "proxy",
                            "action": "eth_getTransactionByHash",
                            "txhash": tx_hash,
                            "apikey": self.etherscan_api_key,
                        },
                    )

                    if response.status_code == 200:
                        data = response.json()
                        if data.get("result"):
                            tx = data["result"]
                            return {
                                "tx_hash": tx_hash,
                                "chain": chain,
                                "from": tx.get("from"),
                                "to": tx.get("to"),
                                "value": tx.get("value"),
                                "gas": tx.get("gas"),
                                "gas_price": tx.get("gasPrice"),
                                "input": tx.get("input"),
                            }

            logger.warning(f"Transaction {tx_hash} not found on {chain}")
            return None

        except Exception as e:
            logger.error(f"Error fetching transaction from Blockscout: {e}")
            return None

    async def get_address_transactions(
        self, chain: str, address: str, limit: int = 10
    ) -> List[Dict]:
        """
        Get recent transactions for an address.

        Args:
            chain: Chain name
            address: Wallet address
            limit: Maximum number of transactions to return

        Returns:
            List of transaction dicts
        """
        try:
            endpoint = BLOCKSCOUT_ENDPOINTS.get(chain.lower())
            if not endpoint:
                logger.warning(f"No Blockscout endpoint for {chain}")
                return []

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{endpoint}/addresses/{address}/transactions",
                    params={"limit": limit},
                )

                if response.status_code == 200:
                    data = response.json()
                    transactions = []

                    for tx in data.get("items", [])[:limit]:
                        transactions.append(
                            {
                                "tx_hash": tx.get("hash"),
                                "chain": chain,
                                "from": tx.get("from", {}).get("hash"),
                                "to": tx.get("to", {}).get("hash"),
                                "value": tx.get("value"),
                                "status": tx.get("status"),
                                "block_number": tx.get("block_number"),
                                "timestamp": tx.get("timestamp"),
                            }
                        )

                    return transactions

            return []

        except Exception as e:
            logger.error(f"Error fetching address transactions: {e}")
            return []

    async def get_token_transfer(self, chain: str, tx_hash: str) -> Optional[Dict]:
        """
        Get token transfer details from a transaction (for ERC-20 bridges).

        Args:
            chain: Chain name
            tx_hash: Transaction hash

        Returns:
            Dict with token transfer details or None
        """
        try:
            endpoint = BLOCKSCOUT_ENDPOINTS.get(chain.lower())
            if not endpoint:
                return None

            async with httpx.AsyncClient(timeout=10.0) as client:
                # Get transaction
                tx_response = await client.get(f"{endpoint}/transactions/{tx_hash}")

                if tx_response.status_code == 200:
                    tx_data = tx_response.json()

                    # Check if it's a token transfer by looking at logs
                    # This is a simplified version - real implementation would parse logs
                    return {
                        "tx_hash": tx_hash,
                        "chain": chain,
                        "is_token_transfer": tx_data.get("type") == "token transfer",
                        "method": tx_data.get("method"),
                        "logs_count": len(tx_data.get("logs", [])),
                    }

            return None

        except Exception as e:
            logger.error(f"Error fetching token transfer: {e}")
            return None

    async def get_bridge_status(self, from_chain: str, to_chain: str, tx_hash: str) -> Dict:
        """
        Check the status of a cross-chain bridge by looking at both source and destination.

        Args:
            from_chain: Source chain
            to_chain: Destination chain
            tx_hash: Transaction hash on source chain

        Returns:
            Dict with bridge status information
        """
        try:
            source_tx = await self.get_transaction(from_chain, tx_hash)

            status = {
                "source_chain": from_chain,
                "source_tx": tx_hash,
                "source_confirmed": False,
                "dest_chain": to_chain,
                "dest_tx": None,
                "dest_confirmed": False,
                "overall_status": "pending",
            }

            if source_tx:
                source_status = source_tx.get("status")
                status["source_confirmed"] = source_status == "ok" or source_status == "success"
                status["block_number"] = source_tx.get("block_number")

            # Note: Finding the corresponding destination transaction requires monitoring events
            # This is typically done by an autonomous agent listening to bridge contract events

            return status

        except Exception as e:
            logger.error(f"Error checking bridge status: {e}")
            return {
                "error": str(e),
                "source_chain": from_chain,
                "dest_chain": to_chain,
                "source_tx": tx_hash,
            }

    def get_explorer_url(self, chain: str, tx_hash: str) -> str:
        """Get direct link to transaction on blockchain explorer."""
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

    async def verify_token_approval(
        self, chain: str, token_address: str, spender_address: str, owner_address: str
    ) -> Optional[str]:
        """
        Check if token is approved for a spender (for bridge contracts).

        Args:
            chain: Chain name
            token_address: Token contract address
            spender_address: Spender contract address (bridge contract)
            owner_address: Token owner address

        Returns:
            Approval amount as string or None if not approved
        """
        try:
            endpoint = BLOCKSCOUT_ENDPOINTS.get(chain.lower())
            if not endpoint:
                return None

            # This would require querying the token contract state
            # Implementation depends on blockchain RPC availability
            logger.info(
                f"Token approval check: {token_address} to {spender_address} by {owner_address}"
            )
            return None

        except Exception as e:
            logger.error(f"Error verifying token approval: {e}")
            return None
