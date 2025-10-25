"""
MeTTa-Only Intent Parser for CrossMind
Primary engine: MeTTa/Atomese logic-based reasoning (ASI)

IMPORTANT: This module contains NO OpenAI imports to avoid accidentally using
invalid API keys from the environment. OpenAI integration is completely separate.
"""

import logging
from typing import Dict
from datetime import datetime
from utils.metta_reasoner import get_metta_reasoner

logger = logging.getLogger(__name__)


class MeTTaOnlyIntentParser:
    """
    Intent parser using ONLY MeTTa symbolic reasoning.
    No OpenAI dependencies - completely self-contained.
    """

    def __init__(self):
        self.metta_reasoner = get_metta_reasoner()
        self.parse_history = []

        logger.info("Initialized MeTTaOnlyIntentParser (MeTTa-only, no external APIs)")
        logger.info("Primary engine: MeTTa Reasoner (ASI)")
        logger.info("Fallback engine: None (MeTTa only)")

    async def parse_message(self, message: str) -> Dict:
        """
        Parse a user message using ONLY MeTTa reasoning.

        Args:
            message: User's natural language message

        Returns:
            Dict with parsed intent and reasoning details
        """
        try:
            logger.info(f"Parsing message with MeTTa: {message}")

            # Check for balance check request directly
            message_lower = message.lower()

            # Balance check keywords
            balance_check_phrases = [
                "check balance", "check my balance", "show balance", "show my balance",
                "what balance", "what's my balance", "how much", "my balance",
                "account balance", "eth balance", "usdc balance", "token balance",
                "portfolio", "holdings", "assets", "funds", "balance?"
            ]

            # If message contains any balance check phrase, treat it as balance check
            if any(phrase in message_lower for phrase in balance_check_phrases):
                logger.info("Detected balance check request")
                return {
                    "action": "balance_check",
                    "status": "success",
                    "raw_message": message,
                    "confidence": 0.95,
                    "primary_engine": "metta"
                }

            # Use MeTTa reasoning directly - no fallbacks
            intent = await self.metta_reasoner.reason_about_intent(message)

            # Add metadata
            intent["primary_engine"] = "metta"
            intent["fallback_used"] = False

            confidence = intent.get("confidence", 0)
            logger.info(f"MeTTa reasoning result: confidence={confidence:.2f}")

            self.parse_history.append({
                "message": message,
                "engine": "metta",
                "confidence": confidence,
                "timestamp": datetime.utcnow().isoformat()
            })

            return intent

        except Exception as e:
            logger.error(f"Error in MeTTa parsing: {e}", exc_info=True)
            return {
                "status": "error",
                "error": str(e),
                "raw_message": message,
                "primary_engine": "metta",
                "fallback_used": False,
                "timestamp": datetime.utcnow().isoformat()
            }

    def validate_intent(self, intent: Dict) -> tuple[bool, str]:
        """
        Validate that the intent has required fields for the action type.

        Args:
            intent: The parsed intent dict

        Returns:
            Tuple of (is_valid: bool, error_message: str)
        """
        if intent.get("status") == "error":
            return False, intent.get("error", "Unknown error in parsing")

        action = intent.get("action")
        if not action:
            return False, "No action detected in message (bridge/swap/bridge_and_swap/balance_check)"

        # Validate required fields for each action
        if action in ["bridge", "bridge_and_swap"]:
            if not intent.get("from_chain"):
                return False, "Source chain is required for bridge"
            if not intent.get("to_chain"):
                return False, "Destination chain is required for bridge"

        if action in ["swap", "bridge_and_swap"]:
            if not intent.get("from_token"):
                return False, "Source token is required for swap"
            if not intent.get("to_token"):
                return False, "Destination token is required for swap"

        # balance_check doesn't require chain (defaults to sepolia)
        if action == "balance_check":
            # If no address provided, will use connected wallet's address
            pass

        return True, ""

    def get_statistics(self) -> Dict:
        """Get parser statistics"""
        return {
            "total_parses": len(self.parse_history),
            "metta_parses": len([p for p in self.parse_history if p["engine"] == "metta"]),
            "average_confidence": (
                sum(p["confidence"] for p in self.parse_history) / len(self.parse_history)
                if self.parse_history else 0
            ),
            "primary_engine": "metta",
            "has_openai": False,
            "timestamp": datetime.utcnow().isoformat()
        }
