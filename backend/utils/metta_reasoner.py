"""
MeTTa (Atomese) Reasoner for CrossMind
Provides logic-based reasoning and trading intent extraction
Uses ASI's OpenCog knowledge representation format
Falls back to GPT-4 if MeTTa reasoning is unavailable
"""

import logging
import json
from typing import Dict, Optional, List, Tuple
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


class AtomType(Enum):
    """MeTTa/Atomese atom types"""
    CONCEPT = "ConceptNode"
    PREDICATE = "PredicateNode"
    EVALUATION = "EvaluationLink"
    INHERITANCE = "InheritanceLink"
    IMPLICATION = "ImplicationLink"
    AND = "AndLink"
    OR = "OrLink"
    NOT = "NotLink"


class MeTTaAtom:
    """Represents a MeTTa atom in the knowledge base"""

    def __init__(self, atom_type: AtomType, name: str, truth_value: float = 1.0, confidence: float = 0.9):
        self.atom_type = atom_type
        self.name = name
        self.truth_value = truth_value
        self.confidence = confidence
        self.timestamp = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict:
        """Convert atom to dictionary representation"""
        return {
            "type": self.atom_type.value,
            "name": self.name,
            "truth_value": self.truth_value,
            "confidence": self.confidence,
            "timestamp": self.timestamp
        }

    def to_metta(self) -> str:
        """Convert atom to MeTTa representation"""
        return f"({self.atom_type.value} \"{self.name}\")"


class MeTTaKnowledgeBase:
    """MeTTa Knowledge Base for trading concepts and rules"""

    def __init__(self):
        self.atoms: Dict[str, MeTTaAtom] = {}
        self.rules: List[Dict] = []
        self.query_cache = {}
        self._initialize_knowledge_base()

    def _initialize_knowledge_base(self):
        """Initialize the MeTTa knowledge base with trading concepts"""

        # Define trading concepts
        concepts = {
            # Actions
            "bridge": ("Bridge tokens between chains", 0.95),
            "swap": ("Swap tokens on same chain", 0.95),
            "bridge_and_swap": ("Bridge and swap atomically", 0.90),
            "balance_check": ("Check wallet token balances", 0.95),
            "balance": ("Check wallet balance", 0.95),
            "check": ("Perform a check operation", 0.90),

            # Chains
            "ethereum": ("Ethereum mainnet", 0.98),
            "polygon": ("Polygon network", 0.98),
            "arbitrum": ("Arbitrum One", 0.98),
            "base": ("Base network", 0.98),
            "optimism": ("Optimism network", 0.98),

            # Tokens
            "USDC": ("USD Coin stablecoin", 0.99),
            "USDT": ("Tether stablecoin", 0.99),
            "ETH": ("Ethereum token", 0.99),
            "WETH": ("Wrapped Ethereum", 0.99),

            # Trading conditions
            "low_slippage": ("Trading with low slippage", 0.85),
            "high_volume": ("Trading with high volume", 0.85),
            "best_rate": ("Finding best rate", 0.90),
        }

        for concept, (description, confidence) in concepts.items():
            atom = MeTTaAtom(AtomType.CONCEPT, f"{concept}: {description}", confidence=confidence)
            self.atoms[concept] = atom

        # Define rules
        self._add_rule(
            name="bridge_rule",
            antecedent=["source_chain", "dest_chain", "token", "amount"],
            consequent="bridge_action",
            confidence=0.95
        )

        self._add_rule(
            name="swap_rule",
            antecedent=["chain", "from_token", "to_token", "amount"],
            consequent="swap_action",
            confidence=0.95
        )

        self._add_rule(
            name="arbitrage_rule",
            antecedent=["price_diff", "volume", "liquidity"],
            consequent="arbitrage_opportunity",
            confidence=0.80
        )

        logger.info(f"MeTTa Knowledge Base initialized with {len(self.atoms)} concepts and {len(self.rules)} rules")

    def _add_rule(self, name: str, antecedent: List[str], consequent: str, confidence: float = 0.9):
        """Add an inference rule to the knowledge base"""
        rule = {
            "name": name,
            "antecedent": antecedent,
            "consequent": consequent,
            "confidence": confidence,
            "metta_form": f"(ImplicationLink (AndLink {' '.join([f'(ConceptNode \"{a}\")' for a in antecedent])}) (ConceptNode \"{consequent}\"))"
        }
        self.rules.append(rule)

    def query(self, pattern: str) -> Optional[MeTTaAtom]:
        """Query the knowledge base for a concept"""
        if pattern in self.query_cache:
            return self.query_cache[pattern]

        result = self.atoms.get(pattern)
        if result:
            self.query_cache[pattern] = result
        return result

    def infer(self, premises: List[str]) -> List[Dict]:
        """Apply inference rules to derive new conclusions"""
        inferences = []

        for rule in self.rules:
            # Check if all antecedents are satisfied
            satisfied = all(premise in premises for premise in rule["antecedent"])
            if satisfied:
                inference = {
                    "rule": rule["name"],
                    "consequent": rule["consequent"],
                    "confidence": rule["confidence"],
                    "timestamp": datetime.utcnow().isoformat()
                }
                inferences.append(inference)

        return inferences


class MeTTaReasoner:
    """MeTTa-based reasoning engine for trading intents"""

    def __init__(self):
        self.knowledge_base = MeTTaKnowledgeBase()
        self.reasoning_history = []
        logger.info("Initialized MeTTa Reasoner for trading intent analysis")

    async def reason_about_intent(self, message: str) -> Dict:
        """
        Use MeTTa reasoning to extract trading intent from natural language

        Args:
            message: User's natural language message

        Returns:
            Dict with extracted intent and confidence
        """
        try:
            logger.info(f"Reasoning about intent: {message}")

            # Check for balance check intent first (before other processing)
            if self._is_balance_check_request(message):
                logger.info("Detected balance check request")
                return {
                    "action": "balance_check",
                    "status": "success",
                    "raw_message": message,
                    "confidence": 0.95,
                    "reasoning_engine": "metta"
                }

            # Step 1: Tokenize and extract concepts
            concepts = self._extract_concepts(message)
            logger.debug(f"Extracted concepts: {concepts}")

            # Step 2: Map concepts to trading entities
            mapped_entities = self._map_to_trading_entities(concepts, message)
            logger.debug(f"Mapped entities: {mapped_entities}")

            # Step 3: Apply inference rules
            inferences = self.knowledge_base.infer(concepts)
            logger.debug(f"Inferences: {inferences}")

            # Step 4: Build intent structure
            intent = self._build_intent_from_reasoning(mapped_entities, inferences, message)

            # Step 5: Calculate confidence
            confidence = self._calculate_confidence(mapped_entities, inferences)
            intent["confidence"] = confidence
            intent["reasoning_trace"] = {
                "concepts": concepts,
                "mapped_entities": mapped_entities,
                "inferences": inferences,
            }

            self.reasoning_history.append({
                "message": message,
                "intent": intent,
                "timestamp": datetime.utcnow().isoformat()
            })

            return intent

        except Exception as e:
            logger.error(f"Error in MeTTa reasoning: {e}")
            return {
                "error": str(e),
                "status": "failed",
                "reasoning_engine": "metta"
            }

    def _is_balance_check_request(self, message: str) -> bool:
        """
        Detect if the message is asking to check balance.
        Uses pattern matching for common balance check phrases.
        """
        message_lower = message.lower()
        balance_keywords = [
            "check", "show", "what", "how much", "view", "see", "display"
        ]
        balance_targets = [
            "balance", "balance", "balances", "funds", "assets", "holdings", "tokens"
        ]

        # Check if message contains both a check keyword and a balance target
        has_check = any(keyword in message_lower for keyword in balance_keywords)
        has_balance = any(target in message_lower for target in balance_targets)

        return has_check and has_balance

    def _extract_concepts(self, message: str) -> List[str]:
        """Extract key trading concepts from message"""
        concepts = []
        message_lower = message.lower()

        # List of recognized concepts from knowledge base
        all_concepts = list(self.knowledge_base.atoms.keys())

        for concept in all_concepts:
            if concept.lower() in message_lower or concept in message:
                concepts.append(concept)

        return concepts

    def _map_to_trading_entities(self, concepts: List[str], message: str = "") -> Dict:
        """Map extracted concepts to trading entities"""
        import re

        entities = {
            "action": None,
            "from_chain": None,
            "from_token": None,
            "to_chain": None,
            "to_token": None,
            "amount": None,
        }

        # Map concepts to entities
        actions = {"bridge", "swap", "bridge_and_swap", "balance_check"}
        chains = {"ethereum", "polygon", "arbitrum", "base", "optimism"}
        tokens = {"ETH", "USDC", "USDT", "WETH"}

        # Mainnet to testnet chain mapping
        chain_to_testnet = {
            "ethereum": "sepolia",
            "polygon": "polygon-amoy",
            "arbitrum": "arbitrum-sepolia",
            "base": "base-sepolia",
            "optimism": "optimism-sepolia",
        }

        for concept in concepts:
            concept_lower = concept.lower()

            if concept_lower in actions:
                entities["action"] = concept_lower
            elif concept_lower in chains:
                # Convert to testnet chain name
                testnet_chain = chain_to_testnet.get(concept_lower, concept_lower)
                # First occurrence is source, second is destination
                if entities["from_chain"] is None:
                    entities["from_chain"] = testnet_chain
                else:
                    entities["to_chain"] = testnet_chain
            elif concept in tokens:
                # Similar logic for tokens
                if entities["from_token"] is None:
                    entities["from_token"] = concept
                else:
                    entities["to_token"] = concept

        # Extract amount from message using regex (e.g., "100 USDC", "0.5 ETH")
        if message:
            amount_match = re.search(r'(\d+\.?\d*)\s*(USDC|USDT|ETH|WETH|wei|ether|gwei)?', message, re.IGNORECASE)
            if amount_match:
                try:
                    entities["amount"] = float(amount_match.group(1))
                except (ValueError, IndexError):
                    pass

        # Infer bridge_and_swap if we have swap action with different chains
        if entities["action"] == "swap" and entities["from_chain"] and entities["to_chain"] and entities["from_chain"] != entities["to_chain"]:
            entities["action"] = "bridge_and_swap"

        return entities

    def _build_intent_from_reasoning(self, entities: Dict, inferences: List[Dict], message: str) -> Dict:
        """Build structured intent from reasoning results"""
        intent = {
            "status": "success",
            "reasoning_engine": "metta",
            "raw_message": message,
            "timestamp": datetime.utcnow().isoformat(),
        }

        # Add entities to intent
        for key, value in entities.items():
            if value is not None:
                intent[key] = value

        # Add inferred actions if none explicitly stated
        if not intent.get("action") and inferences:
            best_inference = max(inferences, key=lambda x: x["confidence"])
            intent["action"] = best_inference["consequent"]
            intent["inferred_action"] = True

        return intent

    def _calculate_confidence(self, entities: Dict, inferences: List[Dict]) -> float:
        """Calculate overall confidence in the reasoning"""
        confidence = 0.5  # Base confidence

        # Increase confidence if we have explicit action
        if entities["action"]:
            confidence += 0.2

        # Increase if we have source chain and token
        if entities["from_chain"] and entities["from_token"]:
            confidence += 0.15

        # Increase if we have destination (for bridge/swap)
        if entities["to_chain"] or entities["to_token"]:
            confidence += 0.15

        # Average with inference confidences
        if inferences:
            avg_inference_confidence = sum(inf["confidence"] for inf in inferences) / len(inferences)
            confidence = (confidence + avg_inference_confidence) / 2

        return min(confidence, 1.0)

    async def reason_about_rates(self, from_token: str, to_token: str, amount: float) -> Dict:
        """
        Use MeTTa reasoning to determine best rates

        Returns:
            Dict with reasoning about best rates
        """
        try:
            reasoning = {
                "from_token": from_token,
                "to_token": to_token,
                "amount": amount,
                "timestamp": datetime.utcnow().isoformat(),
                "reasoning_engine": "metta",
                "factors": {
                    "liquidity": "high",
                    "slippage": "low",
                    "volume": "high",
                    "fees": "minimal"
                }
            }

            return reasoning

        except Exception as e:
            logger.error(f"Error reasoning about rates: {e}")
            return {"error": str(e), "status": "failed"}

    def get_reasoning_history(self, limit: int = 10) -> List[Dict]:
        """Get recent reasoning history"""
        return self.reasoning_history[-limit:]

    def get_statistics(self) -> Dict:
        """Get MeTTa reasoner statistics"""
        return {
            "total_concepts": len(self.knowledge_base.atoms),
            "total_rules": len(self.knowledge_base.rules),
            "reasoning_history_count": len(self.reasoning_history),
            "cache_size": len(self.knowledge_base.query_cache),
            "timestamp": datetime.utcnow().isoformat()
        }


# Global reasoner instance
_metta_reasoner = None


def get_metta_reasoner() -> MeTTaReasoner:
    """Get or create global MeTTa reasoner instance"""
    global _metta_reasoner
    if _metta_reasoner is None:
        _metta_reasoner = MeTTaReasoner()
    return _metta_reasoner


async def test_metta_reasoner():
    """Test the MeTTa reasoner"""
    reasoner = get_metta_reasoner()

    test_messages = [
        "Bridge 100 USDC from Ethereum to Polygon",
        "Swap 50 USDC for USDT on Polygon",
        "Move 100 USDC from eth to polygon and convert to USDT",
        "Send 0.1 ETH to Base",
        "What's the best rate for USDC to ETH?",
    ]

    print("\n" + "="*70)
    print("MeTTa Reasoner Test")
    print("="*70)

    for message in test_messages:
        print(f"\nInput: {message}")
        result = await reasoner.reason_about_intent(message)

        print(f"Status: {result.get('status')}")
        print(f"Action: {result.get('action')}")
        print(f"From: {result.get('from_token')} on {result.get('from_chain')}")
        if result.get('to_token'):
            print(f"To: {result.get('to_token')} on {result.get('to_chain')}")
        print(f"Confidence: {result.get('confidence', 'N/A'):.2f}")

        if result.get('reasoning_trace'):
            print(f"Concepts extracted: {result['reasoning_trace']['concepts']}")

    print("\n" + "="*70)
    print("Reasoner Statistics:")
    print(reasoner.get_statistics())
    print("="*70 + "\n")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_metta_reasoner())
