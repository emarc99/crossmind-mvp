"""
Hybrid Intent Parser for CrossMind
Primary: MeTTa/Atomese logic-based reasoning (ASI)
Fallback: GPT-4 natural language processing (OpenAI)

Uses symbolic reasoning by default, falls back to neural reasoning if needed.
"""

import json
import logging
from typing import Dict, Optional, Tuple
from datetime import datetime
from openai import AsyncOpenAI
from utils.metta_reasoner import get_metta_reasoner

logger = logging.getLogger(__name__)

# System prompt for GPT-4 fallback
INTENT_PARSER_PROMPT = """You are an expert cryptocurrency trading assistant.
Your job is to parse user messages about cross-chain trading and extract the intent.

Analyze the user message and extract:
- action: "bridge" (transfer same token to different chain), "swap" (exchange tokens on same chain), or "bridge_and_swap" (bridge + swap)
- from_chain: source blockchain (ethereum, polygon, arbitrum, base, optimism)
- from_token: source token (ETH, USDC, USDT, WETH)
- to_chain: destination blockchain (only required for bridge/bridge_and_swap)
- to_token: destination token (only required for swap/bridge_and_swap)
- amount: numeric amount to trade

Supported chains: ethereum, polygon, arbitrum, base, optimism
Supported tokens: ETH, USDC, USDT, WETH

Examples:
- "send 100 USDC from ethereum to polygon" → bridge
- "swap 50 USDC for USDT on polygon" → swap
- "bridge 100 USDC from eth to polygon and convert to USDT" → bridge_and_swap
- "move 0.1 ETH to base" → bridge

Return a JSON object with the extracted fields. If a field is missing, set it to null.
Always include confidence (0-1) indicating how confident you are in the parsing."""


class HybridIntentParser:
    """
    Hybrid intent parser using MeTTa (primary) and GPT-4 (fallback)
    """

    def __init__(self, openai_api_key: str = None):
        self.metta_reasoner = get_metta_reasoner()

        # Only initialize OpenAI if we have a valid API key (not a placeholder)
        self.has_openai = False
        self.openai_client = None

        # Check if we have a valid API key before initializing OpenAI
        # Important: Do NOT pass None to AsyncOpenAI as it will read from OPENAI_API_KEY env var
        is_valid_key = (
            openai_api_key
            and openai_api_key.startswith("sk-")
            and len(openai_api_key) > 20
            and "your" not in openai_api_key.lower()
        )

        if is_valid_key:
            # Only create client if we have a genuinely valid key
            self.openai_client = AsyncOpenAI(api_key=openai_api_key)
            self.has_openai = True

        self.parse_history = []

        logger.info(f"Initialized HybridIntentParser")
        logger.info(f"Primary engine: MeTTa Reasoner (ASI)")
        logger.info(f"Fallback engine: {'GPT-4' if self.has_openai else 'None (disabled)'}")
        if openai_api_key and not self.has_openai:
            logger.warning(f"OpenAI API key detected but appears to be placeholder or invalid - GPT-4 fallback disabled")

    async def parse_message(self, message: str) -> Dict:
        """
        Parse a user message to extract trading intent

        Primary method: MeTTa/Atomese reasoning
        Fallback: GPT-4 if needed

        Args:
            message: User's natural language message

        Returns:
            Dict with parsed intent, reasoning engine used, and confidence
        """
        try:
            # Step 1: Try MeTTa reasoning first (symbolic)
            logger.info(f"Parsing with MeTTa Reasoner: {message}")
            metta_result = await self.metta_reasoner.reason_about_intent(message)

            # Step 2: Check if MeTTa result is satisfactory
            metta_confidence = metta_result.get("confidence", 0)
            logger.info(f"MeTTa confidence: {metta_confidence}, has_openai: {self.has_openai}, openai_client is None: {self.openai_client is None}")

            if metta_confidence >= 0.7 or not self.has_openai:
                # MeTTa is confident enough, use result
                logger.info(f"Using MeTTa result (confidence >= 0.7 or no OpenAI available)")
                metta_result["primary_engine"] = "metta"
                metta_result["fallback_used"] = False
                self.parse_history.append({
                    "message": message,
                    "engine": "metta",
                    "confidence": metta_confidence,
                    "timestamp": datetime.utcnow().isoformat()
                })
                return metta_result

            # Step 3: If MeTTa confidence is low and we have OpenAI, use GPT-4
            if self.has_openai and metta_confidence < 0.7:
                logger.warning(f"MeTTa confidence too low ({metta_confidence:.2f}), falling back to GPT-4")
                gpt_result = await self._parse_with_gpt4(message)
                gpt_result["metta_preliminary_result"] = metta_result
                gpt_result["primary_engine"] = "gpt4"
                gpt_result["fallback_used"] = True
                gpt_result["metta_confidence"] = metta_confidence

                self.parse_history.append({
                    "message": message,
                    "engine": "gpt4_fallback",
                    "confidence": gpt_result.get("confidence", 0),
                    "timestamp": datetime.utcnow().isoformat()
                })
                return gpt_result

            # Default: return MeTTa result if no fallback available
            logger.info(f"Returning MeTTa result as fallback (has_openai={self.has_openai})")
            metta_result["primary_engine"] = "metta"
            metta_result["fallback_used"] = False
            return metta_result

        except Exception as e:
            logger.error(f"Error parsing message: {e}", exc_info=True)
            return {
                "error": str(e),
                "status": "error",
                "raw_message": message,
                "timestamp": datetime.utcnow().isoformat()
            }

    async def _parse_with_gpt4(self, message: str) -> Dict:
        """Parse message using GPT-4 API"""
        try:
            if not self.openai_client:
                raise ValueError("OpenAI API key not configured")

            response = await self.openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": INTENT_PARSER_PROMPT},
                    {"role": "user", "content": message}
                ],
                temperature=0.7,
                max_tokens=500
            )

            response_text = response.choices[0].message.content.strip()

            # Try to parse as JSON
            try:
                parsed = json.loads(response_text)
            except json.JSONDecodeError:
                # Try to extract JSON from response
                import re
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group())
                else:
                    return {
                        "error": "Could not parse GPT-4 response as JSON",
                        "raw_response": response_text,
                        "status": "error"
                    }

            parsed["raw_message"] = message
            parsed["status"] = "success"
            parsed["reasoning_engine"] = "gpt4"
            return parsed

        except Exception as e:
            logger.error(f"Error with GPT-4 parsing: {e}")
            return {
                "error": str(e),
                "status": "error",
                "reasoning_engine": "gpt4"
            }

    async def parse_for_best_rate(self, message: str) -> Dict:
        """
        Specialized parsing for best rate queries

        Example: "get best rate for USDC/ETH"
        """
        try:
            # Use MeTTa reasoning for rate analysis
            metta_rate_reasoning = await self.metta_reasoner.reason_about_rates(
                from_token="USDC",
                to_token="ETH",
                amount=1.0
            )

            return {
                "status": "success",
                "query_type": "best_rate",
                "reasoning_engine": "metta",
                "rate_analysis": metta_rate_reasoning,
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Error analyzing best rate: {e}")
            return {"error": str(e), "status": "failed"}

    def validate_intent(self, intent: Dict) -> Tuple[bool, str]:
        """
        Validate parsed intent has required fields

        Args:
            intent: Parsed intent dict

        Returns:
            Tuple of (is_valid, error_message)
        """
        if intent.get("status") == "error":
            return False, intent.get("error", "Unknown error")

        action = intent.get("action", "").lower()
        if not action:
            return False, "No action detected (bridge, swap, or bridge_and_swap)"

        # Validate action
        valid_actions = ["bridge", "swap", "bridge_and_swap"]
        if action not in valid_actions:
            return False, f"Invalid action: {action}. Must be one of: {valid_actions}"

        # Validate required fields based on action
        amount = intent.get("amount")
        if amount is None or amount <= 0:
            return False, "Invalid or missing amount"

        from_token = intent.get("from_token", "").upper()
        if not from_token:
            return False, "No source token specified"

        supported_tokens = ["ETH", "USDC", "USDT", "WETH"]
        if from_token not in supported_tokens:
            return False, f"Unsupported token: {from_token}. Supported: {supported_tokens}"

        from_chain = intent.get("from_chain", "").lower()
        if not from_chain:
            return False, "No source chain specified"

        supported_chains = ["ethereum", "polygon", "arbitrum", "base", "optimism"]
        if from_chain not in supported_chains:
            return False, f"Unsupported chain: {from_chain}. Supported: {supported_chains}"

        # Validate action-specific fields
        if action in ["bridge", "bridge_and_swap"]:
            to_chain = intent.get("to_chain", "").lower()
            if not to_chain:
                return False, f"Action {action} requires destination chain"
            if to_chain not in supported_chains:
                return False, f"Unsupported destination chain: {to_chain}"

        if action in ["swap", "bridge_and_swap"]:
            to_token = intent.get("to_token", "").upper()
            if not to_token:
                return False, f"Action {action} requires destination token"
            if to_token not in supported_tokens:
                return False, f"Unsupported destination token: {to_token}"

        return True, ""

    def get_parse_statistics(self) -> Dict:
        """Get parsing statistics"""
        metta_stats = self.metta_reasoner.get_statistics()
        parse_stats = {
            "total_parses": len(self.parse_history),
            "metta_primary": len([p for p in self.parse_history if p["engine"] == "metta"]),
            "gpt4_fallback": len([p for p in self.parse_history if "gpt4" in p["engine"]]),
            "has_openai": self.has_openai,
            "timestamp": datetime.utcnow().isoformat()
        }

        return {
            "parse_statistics": parse_stats,
            "metta_statistics": metta_stats
        }

    def get_parse_history(self, limit: int = 10) -> list:
        """Get recent parse history"""
        return self.parse_history[-limit:]


async def test_hybrid_parser():
    """Test the hybrid intent parser"""
    # Initialize without OpenAI for testing MeTTa
    parser = HybridIntentParser(openai_api_key=None)

    print("\n" + "="*80)
    print("Hybrid Intent Parser Test (MeTTa Primary, No GPT-4 Fallback)")
    print("="*80)

    test_messages = [
        "Bridge 100 USDC from Ethereum to Polygon",
        "Swap 50 USDC for USDT on Polygon",
        "Move 100 USDC from eth to polygon and convert to USDT",
        "Send 0.1 ETH to Base",
        "Get best rate for USDC/ETH",
    ]

    for message in test_messages:
        print(f"\nInput: {message}")
        result = await parser.parse_message(message)

        print(f"Engine: {result.get('primary_engine', 'unknown')}")
        print(f"Status: {result.get('status')}")
        if result.get("action"):
            print(f"Action: {result.get('action')}")
            print(f"From: {result.get('from_token')} on {result.get('from_chain')}")
            if result.get('to_token'):
                print(f"To: {result.get('to_token')} on {result.get('to_chain')}")
        print(f"Confidence: {result.get('confidence', 'N/A'):.2f}")

    print("\n" + "="*80)
    print("Parser Statistics:")
    stats = parser.get_parse_statistics()
    print(json.dumps(stats, indent=2))
    print("="*80 + "\n")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_hybrid_parser())
