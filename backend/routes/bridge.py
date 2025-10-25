"""
Bridge API Routes
Endpoints for Avail Nexus cross-chain bridging operations
"""

import logging
import hashlib
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from clients.avail_nexus import AvailNexusClient
from clients.pyth_client import PythClient
from clients.blockscout_client import BlockscoutClient

logger = logging.getLogger(__name__)

# Initialize clients
avail_client = AvailNexusClient("testnet")
pyth_client = PythClient("testnet")
blockscout_client = BlockscoutClient()

# Create router
router = APIRouter(prefix="/api/bridge", tags=["bridge"])


# ============================================================================
# Request/Response Models
# ============================================================================


class BridgeQuoteRequest(BaseModel):
    """Request for getting a bridge quote"""

    from_chain: str = Field(..., description="Source chain (e.g., 'sepolia')")
    to_chain: str = Field(..., description="Destination chain (e.g., 'polygon-amoy')")
    token: str = Field(..., description="Token symbol (e.g., 'USDC')")
    amount: float = Field(..., gt=0, description="Amount to bridge")


class BridgeQuoteResponse(BaseModel):
    """Response with bridge quote details"""

    quote_id: str
    output_amount: float
    gas_cost_usd: float
    bridge_fee_percent: float
    estimated_time_minutes: int
    exchange_rate: float


class ExecuteBridgeRequest(BaseModel):
    """Request to execute a bridge"""

    quote_id: str
    from_chain: str
    to_chain: str
    token: str
    amount: float
    recipient_address: str
    signed_tx_data: str


class ExecuteBridgeResponse(BaseModel):
    """Response after bridge execution"""

    tx_hash: str
    status: str
    estimated_time_minutes: int


class BridgeStatusResponse(BaseModel):
    """Current status of a bridge"""

    overall_status: str  # "bridging", "complete", "failed"
    progress: int  # 0-100
    source_confirmed: bool
    dest_confirmed: bool
    estimated_time_remaining_minutes: int
    source_tx: str
    dest_tx: Optional[str] = None


# ============================================================================
# Bridge Endpoints
# ============================================================================


@router.post("/quote", response_model=BridgeQuoteResponse)
async def get_bridge_quote(request: BridgeQuoteRequest):
    """
    Get a quote for a bridge operation

    - **from_chain**: Source blockchain (e.g., 'sepolia', 'ethereum')
    - **to_chain**: Destination blockchain (e.g., 'polygon-amoy', 'polygon')
    - **token**: Token to bridge (e.g., 'USDC', 'ETH', 'USDT', 'WETH')
    - **amount**: Amount to bridge

    Returns estimated output, gas cost, and time

    Supports any token pair across any chain combination.
    """
    try:
        logger.info(
            f"Bridge quote: {request.from_chain} → {request.to_chain}, "
            f"{request.amount} {request.token}"
        )

        # Get quote from Avail Nexus
        quote = await avail_client.get_bridge_quote(
            request.from_chain,
            request.to_chain,
            request.token,
            request.amount,
        )

        if "error" in quote:
            logger.error(f"Avail Nexus API error: {quote['error']}")
            raise HTTPException(status_code=400, detail=quote["error"])

        # Return real Avail quote data
        return BridgeQuoteResponse(
            quote_id=quote.get("quote_id"),
            output_amount=quote.get("output_amount"),
            gas_cost_usd=quote.get("gas_cost_usd"),
            bridge_fee_percent=quote.get("bridge_fee_percent"),
            estimated_time_minutes=quote.get("estimated_time_minutes"),
            exchange_rate=quote.get("exchange_rate", quote.get("output_amount", request.amount * 0.995) / request.amount),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting bridge quote: {e}")
        raise HTTPException(status_code=500, detail=f"Bridge quote failed: {str(e)}")


@router.post("/execute", response_model=ExecuteBridgeResponse)
async def execute_bridge(request: ExecuteBridgeRequest):
    """
    Execute a bridge transaction

    - **quote_id**: Quote ID from previous /quote call
    - **from_chain**: Source blockchain
    - **to_chain**: Destination blockchain
    - **token**: Token to bridge
    - **amount**: Amount to bridge
    - **recipient_address**: Recipient wallet address
    - **signed_tx_data**: User's signed transaction data

    Returns transaction hash and status
    """
    try:
        logger.info(
            f"Executing bridge: {request.from_chain} → {request.to_chain}, "
            f"TxHash: {request.signed_tx_data[:10]}..."
        )

        # Execute bridge
        result = await avail_client.execute_bridge(
            request.quote_id,
            request.from_chain,
            request.to_chain,
            request.token,
            request.amount,
            request.recipient_address,
            request.signed_tx_data,
        )

        if "error" in result:
            logger.error(f"Avail Nexus execution error: {result['error']}")
            raise HTTPException(status_code=400, detail=result["error"])

        # Return real Avail execution data
        return ExecuteBridgeResponse(
            tx_hash=result.get("tx_hash"),
            status=result.get("status"),
            estimated_time_minutes=result.get("estimated_time_minutes"),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing bridge: {e}")
        raise HTTPException(status_code=500, detail=f"Bridge execution failed: {str(e)}")


@router.get("/status", response_model=BridgeStatusResponse)
async def get_bridge_status(
    tx_hash: str, from_chain: str, to_chain: str
):
    """
    Get current status of a bridge operation

    - **tx_hash**: Transaction hash from source chain
    - **from_chain**: Source blockchain
    - **to_chain**: Destination blockchain

    Returns current progress, confirmation status, and estimated time remaining
    """
    try:
        logger.info(f"Checking bridge status: {tx_hash} ({from_chain} → {to_chain})")

        # Get status from Avail Nexus
        status = await avail_client.check_bridge_status(tx_hash, from_chain, to_chain)

        if "error" in status:
            logger.error(f"Avail Nexus status error: {status['error']}")
            raise HTTPException(status_code=400, detail=status["error"])

        # Enhanced status with blockchain verification
        source_tx = await blockscout_client.get_transaction(from_chain, tx_hash)
        source_confirmed = source_tx and source_tx.get("status") == "ok"

        # Return real Avail status data
        return BridgeStatusResponse(
            overall_status=status.get("overall_status"),
            progress=status.get("progress"),
            source_confirmed=source_confirmed,
            dest_confirmed=status.get("dest_status") == "ok",
            estimated_time_remaining_minutes=status.get("estimated_time_remaining_minutes"),
            source_tx=tx_hash,
            dest_tx=status.get("dest_tx"),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting bridge status: {e}")
        raise HTTPException(status_code=500, detail=f"Bridge status check failed: {str(e)}")


# ============================================================================
# Helper Endpoints
# ============================================================================


@router.get("/supported-chains")
async def get_supported_chains():
    """Get list of supported chains"""
    return {
        "testnet": ["sepolia", "polygon-amoy"],
        "mainnet": ["ethereum", "polygon", "arbitrum", "optimism", "base"],
    }


@router.get("/supported-tokens")
async def get_supported_tokens():
    """Get list of supported tokens"""
    return {
        "USDC": {"decimals": 6, "name": "USD Coin"},
        "USDT": {"decimals": 6, "name": "Tether"},
        "ETH": {"decimals": 18, "name": "Ethereum"},
        "WETH": {"decimals": 18, "name": "Wrapped Ethereum"},
    }


@router.post("/estimate-fees")
async def estimate_fees(
    from_chain: str,
    to_chain: str,
    token: str,
    amount: float,
):
    """Estimate fees for a bridge without creating a quote"""
    try:
        # Rough estimation based on chain gas costs
        gas_estimates = {
            "ethereum": 50.0,
            "sepolia": 5.0,
            "polygon": 1.0,
            "polygon-amoy": 0.1,
            "arbitrum": 5.0,
            "optimism": 3.0,
            "base": 3.0,
        }

        from_gas = gas_estimates.get(from_chain.lower(), 5.0)
        bridge_fee = amount * 0.0005  # 0.05% bridge fee

        return {
            "from_gas_usd": from_gas,
            "bridge_fee_usd": bridge_fee,
            "estimated_total_usd": from_gas + bridge_fee,
        }

    except Exception as e:
        logger.error(f"Error estimating fees: {e}")
        raise HTTPException(status_code=500, detail=str(e))
