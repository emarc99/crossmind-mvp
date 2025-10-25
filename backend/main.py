"""
CrossMind FastAPI Backend
Main application server with endpoints for:
- Intent parsing (MeTTa symbolic reasoning)
- Rate quotation (Pyth Network)
- Trade execution (Avail Nexus)
- Transaction tracking (Blockscout)

NOTE: Uses MeTTa-only reasoning to avoid any OpenAI API key issues.
OpenAI integration is INTENTIONALLY excluded to prevent 401 errors from
placeholder or invalid API keys in the environment.
"""

import os
import logging
from typing import Dict, Optional
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import json

from utils.pyth_fetcher import PythPriceFetcher
from utils.blockscout_api import BlockscoutClient
from utils.intent_parser_metta_only import MeTTaOnlyIntentParser
from utils.bridge_relayer import get_relayer

# Import new route handlers (Days 2-3)
from routes.bridge import router as bridge_router
from routes.agents import router as agents_router

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="CrossMind API",
    description="AI-powered cross-chain trading assistant",
    version="0.1.0"
)

# Add CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize service clients
pyth_fetcher = PythPriceFetcher()
# Note: AvailNexusClient is now in clients/avail_nexus.py and used in routes/bridge.py
blockscout_client = BlockscoutClient()

# Initialize MeTTa-only intent parser (NO OpenAI to avoid 401 errors)
# This is a DELIBERATE design choice to avoid issues with placeholder/invalid API keys
intent_parser = MeTTaOnlyIntentParser()
logger.info("Initialized MeTTaOnlyIntentParser (pure symbolic reasoning, no external LLMs)")

# Store quotes in memory (for demo, would use database in production)
quotes_cache = {}


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "CrossMind API",
        "version": "0.1.0"
    }


@app.post("/parse")
async def parse_intent(request: Dict) -> Dict:
    """
    Parse natural language message to extract trading intent.
    Uses MeTTa (primary) with GPT-4 fallback.

    Request:
    {
        "message": "Bridge 100 USDC from Ethereum to Polygon"
    }

    Response:
    {
        "action": "bridge",
        "from_chain": "ethereum",
        "from_token": "USDC",
        "to_chain": "polygon",
        "to_token": "USDC",
        "amount": 100,
        "confidence": 0.95,
        "status": "success",
        "primary_engine": "metta",
        "fallback_used": false
    }
    """
    try:
        message = request.get("message")
        if not message:
            raise HTTPException(status_code=400, detail="Message is required")

        logger.info(f"Parsing message: {message}")

        # Parse intent using hybrid parser (MeTTa + GPT-4 fallback)
        intent = await intent_parser.parse_message(message)

        logger.info(f"Parse result: {intent}")

        # Check if parsing failed
        if intent.get("status") == "error":
            return {
                "status": "error",
                "error": intent.get("error", "Unknown error"),
                "raw_message": message,
                "primary_engine": intent.get("primary_engine", "metta"),
                "reasoning_engine": intent.get("reasoning_engine", "unknown")
            }

        # Validate intent
        is_valid, error = intent_parser.validate_intent(intent)
        if not is_valid:
            return {
                "status": "error",
                "error": error,
                "raw_message": message,
                "primary_engine": intent.get("primary_engine", "metta")
            }

        return intent

    except Exception as e:
        logger.error(f"Error in parse endpoint: {e}", exc_info=True)
        return {
            "status": "error",
            "error": str(e),
            "raw_message": request.get("message", ""),
            "primary_engine": "error"
        }


@app.post("/quote")
async def get_quote(request: Dict) -> Dict:
    """
    Calculate optimal route and rates for a trade using Pyth prices.

    Request:
    {
        "action": "bridge",
        "from_chain": "ethereum",
        "from_token": "USDC",
        "to_chain": "polygon",
        "to_token": "USDC",
        "amount": 100
    }

    Response:
    {
        "action": "bridge",
        "from_chain": "ethereum",
        "from_token": "USDC",
        "to_chain": "polygon",
        "to_token": "USDC",
        "input_amount": 100,
        "output_amount": 100,
        "gas_cost_usd": 2.50,
        "total_cost_usd": 102.50,
        "route_details": [...],
        "quote_id": "quote_123...",
        "status": "success"
    }
    """
    action = request.get("action", "").lower() if request.get("action") else ""
    from_chain = request.get("from_chain", "").lower() if request.get("from_chain") else ""
    from_token = request.get("from_token", "").upper() if request.get("from_token") else ""
    to_chain = request.get("to_chain", "").lower() if request.get("to_chain") else None
    to_token = request.get("to_token", "").upper() if request.get("to_token") else None
    amount = float(request.get("amount", 0)) if request.get("amount") else 0

    logger.info(f"Quote request: {action} {amount if amount else 'N/A'} {from_token if from_token else 'N/A'}")

    try:
        # Handle balance check - no amount or token required
        if action == "balance_check":
            return {
                "action": "balance_check",
                "status": "success",
                "message": "Balance check request received. Please connect your wallet to check your balance.",
                "quote_id": f"balance_check_{datetime.utcnow().isoformat()}",
                "is_balance_check": True
            }

        if not action or not amount:
            raise HTTPException(status_code=400, detail="Missing required fields")

        # Fetch prices from Pyth
        symbols_to_fetch = [f"{from_token}/USD"]
        if to_token and to_token != from_token:
            symbols_to_fetch.append(f"{to_token}/USD")

        prices = await pyth_fetcher.fetch_multiple_prices(symbols_to_fetch)

        if not prices or f"{from_token}/USD" not in prices:
            raise HTTPException(status_code=503, detail="Could not fetch prices")

        # Build quote based on action
        if action == "bridge":
            # MVP: Only support Sepolia -> Polygon Amoy USDC bridge
            if from_chain != "sepolia" or to_chain != "polygon-amoy" or from_token != "USDC":
                raise HTTPException(
                    status_code=400,
                    detail="MVP supports only USDC bridge from Sepolia to Polygon Amoy"
                )

            # NOTE: Bridge operations now handled by /api/bridge/* endpoints (Days 2-3)
            # This is a legacy endpoint - use POST /api/bridge/quote instead
            raise HTTPException(
                status_code=501,
                detail="Bridge operations moved to /api/bridge/quote endpoint"
            )

        elif action == "swap":
            if not to_token:
                raise HTTPException(status_code=400, detail="Destination token required for swap")

            # NOTE: Swap operations handled by /api/bridge/* endpoints (Days 2-3)
            raise HTTPException(
                status_code=501,
                detail="Swap operations moved to /api/bridge endpoints"
            )

        elif action == "bridge_and_swap":
            if not to_token or to_token == from_token:
                raise HTTPException(
                    status_code=400,
                    detail="Bridge+Swap requires different destination token"
                )

            # NOTE: Bridge+Swap operations handled by /api/bridge/* endpoints (Days 2-3)
            raise HTTPException(
                status_code=501,
                detail="Bridge+Swap operations moved to /api/bridge endpoints"
            )

        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: {action}")

        # Cache quote
        quotes_cache[quote["quote_id"]] = quote

        return quote

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating quote: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate quote")


@app.post("/execute")
async def execute_trade(request: Dict) -> Dict:
    """
    Execute a trade based on a confirmed quote with wallet signature.

    Request:
    {
        "quote_id": "quote_123...",
        "user_address": "0x...",
        "signed_tx": "0x...",  # Signed transaction from user's wallet
        "confirmed": true
    }

    Response:
    {
        "status": "success" | "error",
        "tx_hash": "0x...",
        "message": "Transaction submitted"
    }
    """
    quote_id = request.get("quote_id")
    user_address = request.get("user_address")
    tx_hash = request.get("tx_hash")  # Real transaction hash from blockchain
    confirmed = request.get("confirmed", False)

    if not quote_id or not user_address or not confirmed:
        raise HTTPException(status_code=400, detail="Missing required fields")

    # Get quote from cache
    quote = quotes_cache.get(quote_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found or expired")

    logger.info(f"Executing trade: {quote['action']} for {user_address}")
    if tx_hash:
        logger.info(f"Real transaction on blockchain: {tx_hash}")

    try:
        action = quote["action"]

        if action == "bridge":
            # MVP: Only support Sepolia -> Polygon Amoy USDC bridge
            if quote["from_chain"] == "sepolia" and quote["to_chain"] == "polygon-amoy" and quote["from_token"] == "USDC":
                logger.info(f"Bridge request for {quote['input_amount']} USDC from Sepolia to Polygon Amoy")

                # If user submitted a real transaction, use that tx_hash
                if tx_hash:
                    logger.info(f"User transaction submitted: {tx_hash}")
                    return {
                        "status": "success",
                        "tx_hash": tx_hash,  # Real transaction from user's wallet
                        "quote_id": quote_id,
                        "action": action,
                        "message": f"Bridge transaction submitted: {tx_hash}",
                        "explorer_url": f"https://sepolia.etherscan.io/tx/{tx_hash}"
                    }
                else:
                    # No transaction provided - just log the quote for record
                    logger.warning("No transaction hash provided - transaction would need to be signed with wallet")

                    return {
                        "status": "success",
                        "tx_hash": "",  # Empty until user submits signed tx
                        "quote_id": quote_id,
                        "action": action,
                        "message": "Quote ready - awaiting wallet transaction signature"
                    }
            else:
                raise ValueError("MVP only supports Sepolia -> Polygon Amoy USDC bridge")
        elif action == "swap":
            raise HTTPException(status_code=501, detail="Swap on single chain not yet implemented for MVP")
        elif action == "bridge_and_swap":
            raise HTTPException(status_code=501, detail="Bridge and swap not yet implemented for MVP")
        else:
            raise ValueError(f"Unknown action: {action}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing trade: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to execute trade: {str(e)}")


@app.get("/track/{tx_hash}")
async def track_transaction(
    tx_hash: str,
    from_chain: Optional[str] = None,
    to_chain: Optional[str] = None
) -> Dict:
    """
    Track transaction status using Blockscout.

    Returns:
    {
        "tx_hash": "0x...",
        "status": "pending" | "success" | "failed",
        "progress": 45,
        "message": "Bridging in progress...",
        "estimated_time_remaining_minutes": 3
    }
    """
    if not from_chain:
        raise HTTPException(status_code=400, detail="from_chain is required")

    logger.info(f"Tracking transaction: {tx_hash} on {from_chain}")

    try:
        # For MVP with mock transaction hashes, return simulated progress
        # In production, this would query real blockchain data via Blockscout

        if to_chain:
            # Bridge transaction tracking - simulate realistic progression
            import time
            # Use tx_hash to create deterministic but varying progress
            hash_num = int(tx_hash[2:10], 16) if tx_hash.startswith('0x') else 0
            time_factor = (hash_num % 10) * 10
            progress = min(95, 30 + time_factor)  # Progress between 30-95%

            status = {
                "source_tx": tx_hash,
                "source_chain": from_chain,
                "dest_chain": to_chain,
                "overall_status": "bridging" if progress < 90 else "completing",
                "progress": progress,
                "message": "Bridge transaction in progress..." if progress < 90 else "Finalizing bridge...",
                "estimated_time_remaining_minutes": max(1, 10 - (progress // 10))
            }
        else:
            # Simple transaction tracking
            status = await blockscout_client.get_transaction_status(
                tx_hash,
                from_chain
            )

        if "error" in status:
            return {
                "status": "error",
                "error": status["error"],
                "tx_hash": tx_hash
            }

        return {
            "tx_hash": tx_hash,
            **status
        }

    except Exception as e:
        logger.error(f"Error tracking transaction: {e}")
        # Return demo status instead of error for MVP
        return {
            "tx_hash": tx_hash,
            "status": "pending",
            "progress": 45,
            "message": "Confirming on Sepolia...",
            "estimated_time_remaining_minutes": 3,
            "is_demo": True
        }


@app.get("/balances/{address}")
async def get_unified_balances(address: str) -> Dict:
    """
    Get unified portfolio balances across all chains.

    Returns:
    {
        "address": "0x...",
        "balances": [...],
        "total_usd": 1234.56
    }
    """
    logger.info(f"Fetching balances for {address}")

    try:
        # NOTE: Balance operations handled by blockscout API (integrated in various endpoints)
        # For MVP demo, return mock balance data
        return {
            "address": address,
            "balances": [
                {
                    "chain": "sepolia",
                    "token": "USDC",
                    "amount": 1000.0,
                    "value_usd": 1000.0
                }
            ],
            "total_usd": 1000.0,
            "status": "success"
        }

    except Exception as e:
        logger.error(f"Error fetching balances: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch balances")


@app.get("/")
async def root():
    """Root endpoint with API documentation."""
    return {
        "name": "CrossMind API",
        "description": "AI-powered cross-chain trading assistant",
        "version": "0.1.0",
        "endpoints": {
            "health": "GET /health",
            "parse_intent": "POST /parse",
            "get_quote": "POST /quote",
            "execute_trade": "POST /execute",
            "track_transaction": "GET /track/{tx_hash}",
            "get_balances": "GET /balances/{address}"
        }
    }


@app.get("/bridge-status/{tx_hash}")
async def get_bridge_status(tx_hash: str) -> Dict:
    """
    Get the status of a bridge transaction.

    Returns:
    {
        "tx_hash": "0x...",
        "status": "pending" | "completed" | "unknown",
        "data": {...}
    }
    """
    try:
        relayer = get_relayer()

        # Check for new bridge events before returning status
        await relayer.listen_for_bridge_events_once()

        status = await relayer.get_bridge_status(tx_hash)
        return {
            "tx_hash": tx_hash,
            **status
        }
    except Exception as e:
        logger.error(f"Error getting bridge status: {e}")
        return {
            "tx_hash": tx_hash,
            "status": "unknown",
            "data": {}
        }


@app.post("/relayer/check-events")
async def relayer_check_events() -> Dict:
    """
    Manually trigger the relayer to check for pending bridge events on Sepolia.
    Useful for debugging and testing.
    """
    try:
        relayer = get_relayer()
        current_block = await relayer.listen_for_bridge_events_once()

        return {
            "status": "success",
            "message": "Checked for bridge events on Sepolia",
            "current_block": current_block,
            "initiated_bridges": len(relayer.initiated_bridges),
            "completed_bridges": len(relayer.completed_bridges),
        }
    except Exception as e:
        logger.error(f"Error checking for bridge events: {e}")
        return {
            "status": "error",
            "message": str(e),
        }


@app.get("/check-balance/{address}")
async def check_balance(address: str, chain: str = "sepolia") -> Dict:
    """
    Check token balance for an address on a specific chain.
    Supports queries like: "check balance for 0x3c4AC1D7A10024f6b9ac5ab128564f8706E213F5"

    Returns balance information from Etherscan API (verified, real data).
    """
    try:
        blockscout = BlockscoutClient()

        # Get account info including token balances from Blockscout
        result = await blockscout.get_account_info(address, chain)

        return {
            "status": "success",
            "address": address,
            "chain": chain,
            "balance_data": result
        }
    except Exception as e:
        logger.error(f"Error checking balance: {e}")
        return {
            "status": "error",
            "address": address,
            "chain": chain,
            "error": str(e)
        }


# ============================================================================
# Include route handlers (Days 2-3 and beyond)
# ============================================================================

# Bridge operations (Avail Nexus)
app.include_router(bridge_router)

# Autonomous agent endpoints
app.include_router(agents_router)

# ============================================================================
# Health Check Endpoint
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "0.1.0",
        "timestamp": datetime.utcnow().isoformat(),
        "api_endpoints": [
            "/docs - API documentation",
            "/api/bridge/* - Bridge operations",
            "/api/agent/* - Agent recommendations",
            "/parse - Intent parsing",
            "/quote - Price quotes",
            "/balance - Balance checking",
        ]
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("BACKEND_PORT", 8000))
    host = os.getenv("BACKEND_HOST", "0.0.0.0")

    print("\n" + "="*60)
    print("CrossMind API Server")
    print("="*60)
    print(f"\nStarting server on {host}:{port}")
    print(f"API docs: http://localhost:{port}/docs")
    print("="*60 + "\n")

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=False,
        log_level="info"
    )
