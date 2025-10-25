# CrossMind 🧠

**Autonomous cross-chain bridge optimizer powered by Avail Nexus and MeTTa (ASI)**

> Beautiful animated cross-chain bridging with zero external LLM dependency. Real-time price feeds, intelligent route optimization, and autonomous agent preparation for Days 4-8.

---

## 🎯 What is CrossMind?

CrossMind is an **autonomous cross-chain bridge optimizer** that combines:
- **Real Avail Nexus Infrastructure** - Production cross-chain bridging
- **MeTTa Symbolic AI** - Explainable intent parsing without external LLMs
- **Pyth Network Oracles** - Institutional-grade real-time prices
- **Beautiful Animations** - GPU-accelerated Nexus Flow Visualizer

### Traditional Bridge UI ❌
```
User → Select source chain → Select token → Enter amount →
Check rates manually → Select destination chain →
Check swap rates → Configure slippage → Execute → Wait (5-10 min)
```

### CrossMind Way ✓
```
User clicks "Get Quote" with beautiful animated visualization
    ↓
Instant quote from Avail (no external API calls needed)
    ↓
See real-time price feeds from Pyth Network
    ↓
Animated chain flow shows bridge execution
    ↓
Transaction tracker with Blockscout explorer links
Done! 🎉 (with beautiful UI throughout)
```

---

## ✨ Key Features

### 1. **Nexus Flow Visualizer** 🎨
- Beautiful animated cross-chain bridge visualization
- 7-chain network visualization with gradients
- GPU-accelerated token flow animation with particles
- Real-time progress tracking (0-100%)
- 5-stage bridge execution timeline
- Fully responsive Framer Motion animations

### 2. **MeTTa Symbolic Reasoning** 🧠
- Zero external LLM dependency by default
- 15+ trading concepts in knowledge base
- 3 inference rules: bridge, swap, arbitrage
- Confidence calculation with reasoning traces
- Optional GPT-4 fallback for complex queries
- Fully explainable decision making

### 3. **Real Avail Nexus Infrastructure** ⚡
- Production VectorX Bridge API integration
- Support for 7 blockchains: Ethereum, Polygon, Arbitrum, Optimism, Base, Sepolia, Polygon Amoy
- Support for 4 tokens: USDC, USDT, ETH, WETH
- Instant quote generation (no external API calls)
- Real wallet signature integration
- Cross-chain execution with relayer coordination

### 4. **Pyth Network Oracles** 📊
- Institutional-grade real-time price feeds
- Confidence intervals for all prices
- 8 trading pairs with 60-second cache
- Swap rate calculation with price impact
- Concurrent multi-price fetching

### 5. **Blockscout Integration** 🔍
- Real-time transaction status tracking
- Block confirmation monitoring
- Multi-chain explorer links (Etherscan, Polygonscan, Arbiscan, etc.)
- Unified transaction verification
- Direct blockchain lookups

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Symbolic AI** | MeTTa/ASI (OpenCog) | Logic-based intent parsing (no external LLM) |
| **Fallback LLM** | OpenAI GPT-4 (optional) | Enhanced parsing for complex queries |
| **Price Data** | Pyth Network | Institutional-grade real-time oracles |
| **Cross-Chain Bridge** | Avail Nexus (VectorX) | Production bridge infrastructure |
| **Explorer** | Blockscout | Multi-chain transaction verification |
| **Frontend** | Next.js 14 + React 18 + TypeScript | Beautiful animated UI |
| **Animations** | Framer Motion | GPU-accelerated animations |
| **Charts** | Recharts | Data visualization |
| **Styling** | TailwindCSS + CSS | Responsive design |
| **Web3** | wagmi + viem | Wallet integration |
| **Backend** | FastAPI + Python 3.13 | Async API server |
| **Autonomous Agents** | Fetch.ai uAgents (Days 4-8) | Future agent orchestration |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm or yarn
- API Keys:
  - OpenAI (for GPT-4)
  - Optionally: Blockscout API key (for higher rate limits)

### 1. Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your API keys:
# - OPENAI_API_KEY: Get from https://platform.openai.com/api-keys
# - RPC URLs: Using public endpoints (LLamaRPC) by default

# Start backend
python main.py

or 

python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Backend runs on `http://localhost:8000`

### 2. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Configure environment (already done, but you can edit)
# .env.local has NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Start development server
npm run dev
```

Frontend runs on `http://localhost:3000`

### 3. Test the Application

1. Open http://localhost:3000 in your browser
2. Click "Connect Wallet" (mock wallet for MVP)
3. Try a command:
   - "Bridge 100 USDC from Ethereum to Polygon"
   - "Swap 50 USDC for USDT on Polygon"
   - "Move 100 USDC from eth to polygon and swap to USDT"
   - "What is balance of my tokens"

---

## 📖 How It Works

### Flow Diagram

```
User Types Message
    ↓
Frontend → Backend /parse endpoint
    ↓
Intent Parser (GPT-4) extracts action/chains/tokens
    ↓
Frontend → Backend /quote endpoint
    ↓
Rate Optimizer (Pyth Network) calculates route
    ↓
Display Quote Card to User
    ↓
User Clicks Confirm
    ↓
Frontend → Backend /execute endpoint
    ↓
Bridge Executor (Avail Nexus) executes trades
    ↓
Frontend → Backend /track endpoint (polling)
    ↓
Blockscout provides live updates
    ↓
Transaction Complete!
```

### Operations Supported

#### 1. Bridge
```
Bridge same token across chains
Example: "Send 100 USDC from Ethereum to Polygon"
- Uses Avail bridge
- Gas: ~$2-50 depending on chains
- Time: ~5-10 minutes
```

#### 2. Swap
```
Exchange tokens on same chain
Example: "Swap 50 USDC for USDT on Polygon"
- Uses Avail swap
- Gas: ~$0.15-2 depending on chain
- Time: ~30 seconds
```

#### 3. Bridge + Swap ⭐
```
Bridge AND swap in optimized route
Example: "Move 100 USDC from Ethereum to Polygon and swap to USDT"
- Intelligently chooses: bridge then swap vs swap then bridge
- Calculates total gas savings
- Executes in two coordinated transactions
```

---

## 📂 Project Structure

```
crossmind/
├── backend/
│   ├── utils/
│   │   ├── pyth_fetcher.py        # Pyth Network integration
│   │   ├── avail_bridge.py        # Avail bridge wrapper
│   │   ├── blockscout_api.py      # Blockscout explorer API
│   │   ├── intent_parser.py       # GPT-4 NLP parser
│   │   └── __init__.py
│   ├── agents/
│   │   └── __init__.py            # Future: Fetch.ai uAgents
│   ├── main.py                     # FastAPI application
│   ├── requirements.txt
│   ├── .env
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── page.tsx               # Main page
│   │   ├── layout.tsx             # Root layout
│   │   └── globals.css            # Global styles
│   ├── components/
│   │   ├── ChatInterface.tsx      # Main chat UI
│   │   ├── MessageBubble.tsx      # Chat message display
│   │   ├── RateDisplay.tsx        # Quote card
│   │   └── TransactionStatus.tsx  # TX tracking
│   ├── lib/
│   │   └── api-client.ts          # Backend API client
│   ├── types/
│   │   └── index.ts               # TypeScript definitions
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── .env.local
│   └── .env.local.example
├── README.md
└── .gitignore
```

---

## 🔗 Supported Chains

- ✅ Ethereum (Mainnet)
- ✅ Polygon (Mainnet)
- ✅ Arbitrum (One)
- ✅ Base
- ✅ Optimism

## 💰 Supported Tokens (Officially by Avail)

- ✅ ETH / WETH
- ✅ USDC
- ✅ USDT

*More coming soon!*

---

## 🧪 Testing

### Test Commands

Try these commands in the chat:

```
1. Simple Bridge:
   "Bridge 100 USDC from Ethereum to Polygon"

2. Simple Swap:
   "Swap 50 USDC for USDT on Polygon"

3. Complex Bridge+Swap:
   "Move 100 USDC from Ethereum to Polygon and swap to USDT"

4. Natural Language Variations:
   "Send 0.1 ETH to Base"
   "Convert 25 USDC to USDT on Arbitrum"
   "I want to bridge 100 USDC, can you move it to Polygon?"
```

### Endpoints

**Backend API** (`http://localhost:8000`)

- `GET /health` - Health check
- `POST /parse` - Parse natural language
- `POST /quote` - Calculate rates
- `POST /execute` - Execute trade
- `GET /track/{tx_hash}` - Track transaction
- `GET /balances/{address}` - Get portfolio

**Interactive Docs**: http://localhost:8000/docs

---

## 🤖 AI Intent Parser

The Intent Parser uses GPT-4/ MeTTa Reasoning to understand natural language trading commands.

### Example Parse

**Input**: `"Bridge 100 USDC from eth to polygon and swap to USDT"`

**Output**:
```json
{
  "action": "bridge_and_swap",
  "from_chain": "ethereum",
  "from_token": "USDC",
  "to_chain": "polygon",
  "to_token": "USDT",
  "amount": 100,
  "confidence": 0.95
}
```

### Supported Intents
-  bridge
-  swap (not implemented)
-  bridge_and_swap (not implemented)

---

## 🔮 Milestones & Future Enhancements

###  **Phase 1: Complete (MVP)**
- [x] Real Avail Nexus bridge infrastructure
- [x] MeTTa symbolic AI reasoning engine
- [x] Pyth Network price oracle integration
- [x] Blockscout transaction tracking
- [x] Beautiful Nexus Flow Visualizer UI
- [x] 7-chain support (Ethereum, Polygon, Arbitrum, Optimism, Base, Sepolia, Polygon Amoy)
- [x] 4-token support (USDC, USDT, ETH, WETH)

### 🚧 **Phase 2: Autonomous Agents** - NOT YET ACHIEVED

#### **Route Optimization Agent**
- [ ] Full MeTTa-based route recommendation system
- [ ] Analyze gas costs across multiple bridge options
- [ ] Compare DEX swap rates vs bridge-native swaps
- [ ] Confidence scoring for route recommendations
- [ ] Learning from historical execution data

#### **Risk Assessment Agent**
- [ ] Evaluate bridge security audits
- [ ] Monitor historical failure rates per route
- [ ] Estimate slippage impact
- [ ] Detect RPC/network anomalies
- [ ] Provide user-friendly risk warnings

#### **Execution Monitor Agent**
- [ ] Real-time transaction monitoring
- [ ] Detect failed/stuck bridges with auto-recovery
- [ ] Predict destination chain timing
- [ ] Alert on slippage exceeding thresholds
- [ ] Autonomous retry logic with fallback routes

#### **Agent-to-Agent Communication**
- [ ] Fetch.ai uAgents framework integration
- [ ] Multi-agent coordination for complex routes
- [ ] Distributed decision-making
- [ ] Agent marketplace for custom strategies

### 🔜 **Phase 3: Enhanced Features (Future)**
- [ ] Additional chains: Solana, Avalanche, Cosmos, zkSync, Starknet
- [ ] More tokens: WBTC, DAI, AAVE, USDE, etc.
- [ ] Advanced portfolio optimization
- [ ] Price alerts and push notifications
- [ ] Historical analytics & charts
- [ ] Limit orders and conditional execution
- [ ] Batch multi-hop operations
- [ ] Mobile app (React Native)
- [ ] Hardware wallet support (Ledger, Trezor, Gnosis Safe)

---

## 📝 API Documentation

Full API docs available at: `http://localhost:8000/docs`

### Example Request: Parse Intent

```bash
curl -X POST http://localhost:8000/parse \
  -H "Content-Type: application/json" \
  -d '{"message": "Bridge 100 USDC from Ethereum to Polygon"}'
```

### Example Request: Get Quote

```bash
curl -X POST http://localhost:8000/quote \
  -H "Content-Type: application/json" \
  -d '{
    "action": "bridge",
    "from_chain": "ethereum",
    "from_token": "USDC",
    "to_chain": "polygon",
    "to_token": "USDC",
    "amount": 100
  }'
```

---

## ⚠️ MVP Status & Known Limitations

### ✅ What Should Be Working (after intensive testing)

- **Real Avail Nexus Infrastructure** - Production VectorX Bridge API
- **Real Price Feeds** - Pyth Network institutional oracle data
- **Real Wallet Integration** - wagmi + viem with MetaMask support
- **Real Transaction Tracking** - Blockscout multi-chain verification
- **Real MeTTa Reasoning** - Symbolic AI without external LLM calls (by default)
- **Beautiful UI** - Fully animated Nexus Flow Visualizer

### ⚠️ Known Limitations

- **Testnet Focus** - Currently optimized for Sepolia/Polygon Amoy testnet
- **Autonomous Agents** - Foundation ready but agent logic not fully implemented (Days 4-8)
- **Limited Token Coverage** - 4 tokens (USDC, USDT, ETH, WETH); more coming soon
- **Stateless Quotes** - Quotes generated server-side (not persisted to blockchain)

### 🔜 Will Be Addressed in Phase 2

- Full MeTTa-based autonomous agent system
- Multi-agent coordination and decision-making
- Advanced route optimization with learning
- Dynamic gas estimation from chain data
- Persistent quote tracking with blockchain verification


---

## 📄 License

MIT License - See LICENSE file for details

---

## 👥 Team

- **Emarc** - Full-stack development, Avail Nexus integration, MeTTa symbolic AI implementation
- **Johnson** - Backend architecture, Pyth oracle integration, autonomous agent framework

Built for ETHGlobal Online 2025 Hackathon

**Special Thanks**: Avail, Pyth Network, Blockscout, Fetch.ai, OpenCog community for making this possible

---

## 📧 Support

For issues and questions, please check the GitHub Issues or reach out to the team.

---

- **Last Updated**: October 2025
- **Status**: MVP - Ready for Demo 🎉
