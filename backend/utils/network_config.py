"""
Network Configuration Manager
Supports both mainnet and Sepolia testnet environments
"""

import os
from typing import Dict, Literal
from enum import Enum

Environment = Literal["mainnet", "testnet"]


class ChainConfig:
    """Configuration for a blockchain network"""
    def __init__(self, name: str, chain_id: int, rpc_url: str, explorer_url: str):
        self.name = name
        self.chain_id = chain_id
        self.rpc_url = rpc_url
        self.explorer_url = explorer_url


class NetworkConfig:
    """Manages network configurations for mainnet and testnet"""

    # Mainnet Configurations
    MAINNET_CHAINS = {
        "ethereum": ChainConfig(
            name="Ethereum",
            chain_id=1,
            rpc_url="https://eth.llamarpc.com",
            explorer_url="https://etherscan.io"
        ),
        "polygon": ChainConfig(
            name="Polygon",
            chain_id=137,
            rpc_url="https://polygon.llamarpc.com",
            explorer_url="https://polygonscan.com"
        ),
        "base": ChainConfig(
            name="Base",
            chain_id=8453,
            rpc_url="https://base.llamarpc.com",
            explorer_url="https://basescan.org"
        ),
        "arbitrum": ChainConfig(
            name="Arbitrum One",
            chain_id=42161,
            rpc_url="https://arb1.arbitrum.io/rpc",
            explorer_url="https://arbiscan.io"
        ),
        "optimism": ChainConfig(
            name="Optimism",
            chain_id=10,
            rpc_url="https://mainnet.optimism.io",
            explorer_url="https://optimistic.etherscan.io"
        ),
    }

    # Testnet (Sepolia) Configurations
    TESTNET_CHAINS = {
        "sepolia": ChainConfig(
            name="Sepolia",
            chain_id=11155111,
            rpc_url=os.getenv("SEPOLIA_RPC_URL", "https://eth-sepolia.g.alchemy.com/v2/demo"),
            explorer_url="https://sepolia.etherscan.io"
        ),
        "polygon-amoy": ChainConfig(
            name="Polygon Amoy",
            chain_id=80002,
            rpc_url=os.getenv("POLYGON_AMOY_RPC_URL", "https://rpc-amoy.polygon.technology/"),
            explorer_url="https://amoy.polygonscan.com"
        ),
        "arbitrum-sepolia": ChainConfig(
            name="Arbitrum Sepolia",
            chain_id=421614,
            rpc_url=os.getenv("ARBITRUM_SEPOLIA_RPC_URL", "https://sepolia-rpc.arbitrum.io/rpc"),
            explorer_url="https://sepolia-explorer.arbitrum.io"
        ),
        "base-sepolia": ChainConfig(
            name="Base Sepolia",
            chain_id=84532,
            rpc_url=os.getenv("BASE_SEPOLIA_RPC_URL", "https://sepolia.base.org"),
            explorer_url="https://sepolia.basescan.org"
        ),
        "optimism-sepolia": ChainConfig(
            name="Optimism Sepolia",
            chain_id=11155420,
            rpc_url=os.getenv("OPTIMISM_SEPOLIA_RPC_URL", "https://sepolia.optimism.io"),
            explorer_url="https://sepolia-optimistic.etherscan.io"
        ),
    }

    def __init__(self, environment: Environment = None):
        """Initialize network configuration for given environment"""
        if environment is None:
            environment = os.getenv("ENVIRONMENT", "testnet")

        self.environment: Environment = environment
        self.is_testnet = environment == "testnet"
        self.is_mainnet = environment == "mainnet"

        # Select appropriate chains based on environment
        self.chains = self.TESTNET_CHAINS if self.is_testnet else self.MAINNET_CHAINS

    def get_chain_config(self, chain_name: str) -> ChainConfig:
        """Get configuration for a specific chain"""
        chain_key = chain_name.lower().replace(" ", "-")

        if chain_key not in self.chains:
            raise ValueError(f"Chain '{chain_name}' not found in {self.environment} environment")

        return self.chains[chain_key]

    def get_rpc_url(self, chain_name: str) -> str:
        """Get RPC URL for a chain"""
        return self.get_chain_config(chain_name).rpc_url

    def get_explorer_url(self, chain_name: str) -> str:
        """Get block explorer URL for a chain"""
        return self.get_chain_config(chain_name).explorer_url

    def get_supported_chains(self) -> list[str]:
        """Get list of supported chains in current environment"""
        return list(self.chains.keys())

    def get_block_explorer_api(self, chain_name: str) -> str:
        """Get Blockscout/Etherscan API URL for a chain"""
        chain_key = chain_name.lower().replace(" ", "-")

        if self.is_testnet:
            explorer_map = {
                "sepolia": os.getenv("BLOCKSCOUT_SEPOLIA_URL", "https://sepolia.blockscout.com/api"),
                "polygon-amoy": os.getenv("BLOCKSCOUT_POLYGON_AMOY_URL", "https://api-amoy.polygonscan.com/api"),
                "arbitrum-sepolia": os.getenv("BLOCKSCOUT_ARBITRUM_SEPOLIA_URL", "https://sepolia-explorer.arbitrum.io/api"),
                "base-sepolia": os.getenv("BLOCKSCOUT_BASE_SEPOLIA_URL", "https://sepolia.basescan.org/api"),
                "optimism-sepolia": os.getenv("BLOCKSCOUT_OPTIMISM_SEPOLIA_URL", "https://sepolia-optimistic.etherscan.io/api"),
            }
        else:
            explorer_map = {
                "ethereum": os.getenv("BLOCKSCOUT_ETH_MAINNET_URL", "https://eth.blockscout.com/api"),
                "polygon": os.getenv("BLOCKSCOUT_POLYGON_MAINNET_URL", "https://polygon.blockscout.com/api"),
                "base": os.getenv("BLOCKSCOUT_BASE_MAINNET_URL", "https://base.blockscout.com/api"),
                "arbitrum": os.getenv("BLOCKSCOUT_ARBITRUM_MAINNET_URL", "https://arbitrum.blockscout.com/api"),
                "optimism": os.getenv("BLOCKSCOUT_OPTIMISM_MAINNET_URL", "https://optimism.blockscout.com/api"),
            }

        if chain_key not in explorer_map:
            raise ValueError(f"Explorer not configured for chain '{chain_name}' in {self.environment} environment")

        return explorer_map[chain_key]


# Global network config instance
_network_config = None


def get_network_config() -> NetworkConfig:
    """Get or create global network config instance"""
    global _network_config
    if _network_config is None:
        _network_config = NetworkConfig()
    return _network_config
