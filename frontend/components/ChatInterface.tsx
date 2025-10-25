"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, RateQuote } from "@/types";
import { apiClient } from "@/lib/api-client";
import { Send, Loader } from "lucide-react";
import MessageBubble from "./MessageBubble";
import RateDisplay from "./RateDisplay";
import TransactionStatus from "./TransactionStatus";
import { buildApprovalTx, buildBridgeTx, parseUSDC } from "@/lib/bridge-encoding";
import { getAllBalances, formatTokenBalance } from "@/lib/all-balances";

interface ChatInterfaceProps {
  userAddress?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ userAddress }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Welcome to CrossMind! I'm your AI trading assistant. Tell me what you'd like to do. For example:\n- Bridge 100 USDC from Ethereum to Polygon\n- Swap 50 USDC for USDT on Polygon\n- Move 100 USDC from Ethereum to Polygon and swap to USDT",
      timestamp: Date.now(),
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<RateQuote | null>(null);
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(null);
  const [trackingTx, setTrackingTx] = useState<{
    hash: string;
    fromChain: string;
    toChain?: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (message: Omit<ChatMessage, "id">) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random()}`,
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage.id;
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // Add user message
    addMessage({
      role: "user",
      content: input,
      timestamp: Date.now(),
    });

    const userMessage = input;
    setInput("");
    setIsLoading(true);

    try {
      // Step 1: Parse intent
      addMessage({
        role: "assistant",
        content: "Analyzing your request...",
        timestamp: Date.now(),
      });

      const intentResult = await apiClient.parseIntent(userMessage);

      if (intentResult.status === "error") {
        addMessage({
          role: "assistant",
          content: `Sorry, I couldn't understand that. ${intentResult.error || "Please try again with a clearer command."}`,
          timestamp: Date.now(),
        });
        return;
      }

      // Step 2: Get quote
      addMessage({
        role: "assistant",
        content: "Calculating best rates...",
        timestamp: Date.now(),
      });

      const quoteResult = await apiClient.getQuote({
        action: intentResult.action,
        from_chain: intentResult.from_chain,
        from_token: intentResult.from_token,
        to_chain: intentResult.to_chain,
        to_token: intentResult.to_token,
        amount: intentResult.amount,
      });

      if (quoteResult.status === "error") {
        addMessage({
          role: "assistant",
          content: `Error getting quote: ${quoteResult.error || "Unknown error"}`,
          timestamp: Date.now(),
        });
        return;
      }

      // Store quote
      setCurrentQuote(quoteResult);

      // Add message with quote
      addMessage({
        role: "assistant",
        content: `I've calculated the best route for your transaction. Please review and confirm:`,
        timestamp: Date.now(),
        quote: quoteResult,
      });
    } catch (error) {
      console.error("Error processing message:", error);
      addMessage({
        role: "assistant",
        content:
          "Sorry, something went wrong. Please try again. Make sure the backend is running on http://localhost:8000",
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmTrade = async () => {
    if (!currentQuote || !userAddress) {
      addMessage({
        role: "assistant",
        content: userAddress
          ? "No quote available to execute"
          : "Please connect your wallet first",
        timestamp: Date.now(),
      });
      return;
    }

    setIsLoading(true);
    try {
      addMessage({
        role: "assistant",
        content: "📝 Requesting signature from your wallet...",
        timestamp: Date.now(),
      });

      // Request wallet signature for bridge transaction
      if (!window.ethereum) {
        throw new Error("No wallet detected. Please install MetaMask.");
      }

      // Request account access
      const accounts = await (window.ethereum as any).request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts available");
      }

      // Check if user is on Sepolia testnet (chain ID 11155111)
      const chainId = await (window.ethereum as any).request({
        method: "eth_chainId",
      });

      const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111 in hex
      if (chainId !== SEPOLIA_CHAIN_ID) {
        addMessage({
          role: "assistant",
          content: "Switching to Sepolia testnet...",
          timestamp: Date.now(),
        });

        // Request user to switch to Sepolia
        try {
          await (window.ethereum as any).request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
          });
        } catch (switchError: any) {
          // If Sepolia is not in user's wallet, add it
          if (switchError.code === 4902) {
            addMessage({
              role: "assistant",
              content: "Adding Sepolia testnet to your wallet...",
              timestamp: Date.now(),
            });

            await (window.ethereum as any).request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: SEPOLIA_CHAIN_ID,
                  chainName: "Sepolia",
                  rpcUrls: ["https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"],
                  blockExplorerUrls: ["https://sepolia.etherscan.io"],
                  nativeCurrency: {
                    name: "ETH",
                    symbol: "ETH",
                    decimals: 18,
                  },
                },
              ],
            });
          } else {
            throw switchError;
          }
        }
      }

      // Get the amount from the quote
      const bridgeAmount = currentQuote.input_amount;
      const amountInWei = parseUSDC(bridgeAmount);

      addMessage({
        role: "assistant",
        content: "🔐 Step 1/2: Approving USDC spending...",
        timestamp: Date.now(),
      });

      // Step 1: Approve USDC spending
      const approvalTx = buildApprovalTx(amountInWei);
      const approvalHash = await (window.ethereum as any).request({
        method: "eth_sendTransaction",
        params: [
          {
            from: accounts[0],
            ...approvalTx,
          },
        ],
      });

      if (!approvalHash) {
        addMessage({
          role: "assistant",
          content: "USDC approval cancelled.",
          timestamp: Date.now(),
        });
        return;
      }

      addMessage({
        role: "assistant",
        content: `✓ USDC approval submitted!\nWaiting for confirmation...\n\nApproval TX: ${approvalHash}`,
        timestamp: Date.now(),
      });

      // Wait a moment for approval to be mined
      await new Promise((resolve) => setTimeout(resolve, 2000));

      addMessage({
        role: "assistant",
        content: "🌉 Step 2/2: Submitting bridge transaction...",
        timestamp: Date.now(),
      });

      // Step 2: Submit bridge transaction with actual amount and recipient
      const bridgeTx = buildBridgeTx(amountInWei, accounts[0]);
      const txHash = await (window.ethereum as any).request({
        method: "eth_sendTransaction",
        params: [
          {
            from: accounts[0],
            ...bridgeTx,
          },
        ],
      });

      if (!txHash) {
        addMessage({
          role: "assistant",
          content: "Bridge transaction submission cancelled.",
          timestamp: Date.now(),
        });
        return;
      }

      addMessage({
        role: "assistant",
        content: `✓ Bridge transaction submitted!\n\nBridge TX Hash: ${txHash}\n\nApproval TX: ${approvalHash}`,
        timestamp: Date.now(),
      });

      // Notify backend of submitted transactions
      const result = await apiClient.executeTrade({
        quote_id: currentQuote.quote_id,
        user_address: userAddress,
        tx_hash: txHash, // Bridge transaction hash
        approval_tx_hash: approvalHash, // USDC approval transaction
        confirmed: true,
      });

      if (result.status === "error") {
        addMessage({
          role: "assistant",
          content: `Trade execution failed: ${result.error || "Unknown error"}`,
          timestamp: Date.now(),
        });
        return;
      }

      // Update UI with success
      setPendingTxHash(result.tx_hash);
      setCurrentQuote(null);

      addMessage({
        role: "assistant",
        content: `✓ Transaction submitted!\n\nTX Hash: ${result.tx_hash}\n\nTracking your transaction...`,
        timestamp: Date.now(),
        txHash: result.tx_hash,
      });

      // Start tracking - convert testnet chain names to display names
      const chainDisplayMap: Record<string, string> = {
        "sepolia": "sepolia",
        "polygon-amoy": "polygon-amoy",
        "arbitrum-sepolia": "arbitrum-sepolia",
        "base-sepolia": "base-sepolia",
        "optimism-sepolia": "optimism-sepolia",
      };

      setTrackingTx({
        hash: result.tx_hash,
        fromChain: chainDisplayMap[currentQuote.from_chain] || currentQuote.from_chain || currentQuote.chain || "sepolia",
        toChain: currentQuote.to_chain ? chainDisplayMap[currentQuote.to_chain] : undefined,
      });
    } catch (error) {
      console.error("Error executing trade:", error);
      addMessage({
        role: "assistant",
        content: `Failed to execute trade: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: Date.now(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelTrade = () => {
    setCurrentQuote(null);
    addMessage({
      role: "assistant",
      content: "Trade cancelled. What else can I help you with?",
      timestamp: Date.now(),
    });
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id}>
            <MessageBubble message={message} />
            {message.quote && !message.quote.is_balance_check && (
              <RateDisplay
                quote={message.quote}
                onConfirm={handleConfirmTrade}
                onCancel={handleCancelTrade}
                isLoading={isLoading}
                walletConnected={!!userAddress}
                userAddress={userAddress}
              />
            )}
            {message.quote && message.quote.is_balance_check && (
              <BalanceCheckDisplay userAddress={userAddress} />
            )}
            {message.txHash && trackingTx && (
              <TransactionStatus
                txHash={message.txHash}
                fromChain={trackingTx.fromChain}
                toChain={trackingTx.toChain}
              />
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader className="animate-spin" size={20} />
            <span className="text-sm">Processing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-700 bg-slate-800 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Tell me what you want to do (e.g., 'Bridge 100 USDC from Ethereum to Polygon')"
            className="flex-1 bg-slate-700 text-white placeholder-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg px-4 py-2 flex items-center gap-2 transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
        {!userAddress && (
          <p className="text-xs text-yellow-500 mt-2">
            Connect your wallet to execute trades
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Balance Check Display Component
 */
interface BalanceCheckDisplayProps {
  userAddress?: string;
}

const BalanceCheckDisplay: React.FC<BalanceCheckDisplayProps> = ({ userAddress }) => {
  const [balances, setBalances] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!userAddress) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getAllBalances(userAddress).then((data) => {
      setBalances(data);
      setLoading(false);
    });
  }, [userAddress]);

  if (!userAddress) {
    return (
      <div className="flex justify-start">
        <div className="max-w-md w-full bg-blue-900/30 border border-blue-600/50 rounded-lg p-4">
          <p className="text-blue-200 text-sm">Please connect your wallet to check your balance</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-start">
        <div className="max-w-md w-full bg-slate-700/50 rounded-lg p-4 flex items-center gap-2">
          <Loader className="animate-spin text-blue-500" size={20} />
          <span className="text-sm text-gray-300">Loading balances...</span>
        </div>
      </div>
    );
  }

  if (!balances || (balances.tokens.length === 0 && balances.eth === 0)) {
    return (
      <div className="flex justify-start">
        <div className="max-w-md w-full bg-blue-900/30 border border-blue-600/50 rounded-lg p-4">
          <p className="text-blue-200 text-sm">No token balances found on Sepolia</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-md w-full bg-blue-900/30 border border-blue-600/50 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-900/50 px-4 py-3 border-b border-blue-600/50">
          <h3 className="text-blue-200 font-semibold text-sm">Sepolia Wallet Balances</h3>
        </div>

        {/* Balances */}
        <div className="p-4 space-y-3">
          {/* ETH Balance */}
          {balances.eth > 0 && (
            <div className="flex items-center justify-between bg-slate-800/50 rounded p-2">
              <span className="text-gray-300 text-sm">ETH</span>
              <span className="text-green-400 font-semibold text-sm">
                {formatTokenBalance(balances.eth, 4)} ETH
              </span>
            </div>
          )}

          {/* Token Balances */}
          {balances.tokens.map((token: any) => (
            <div key={token.address} className="flex items-center justify-between bg-slate-800/50 rounded p-2">
              <span className="text-gray-300 text-sm">{token.symbol}</span>
              <span className="text-green-400 font-semibold text-sm">
                {formatTokenBalance(token.balance)} {token.symbol}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-slate-800/30 px-4 py-2 border-t border-blue-600/50 text-xs text-gray-400">
          {balances.tokens.length + (balances.eth > 0 ? 1 : 0)} token
          {balances.tokens.length + (balances.eth > 0 ? 1 : 0) !== 1 ? "s" : ""} with balance
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
