"use client";

import React, { useState, useEffect } from "react";
import { NexusFlowVisualizer } from "./NexusFlowVisualizer";
import { requestBridgeQuote } from "@/lib/bridge-service";
import { useAccount } from "wagmi";
import { getAvailNexusBridge } from "@/lib/avail-nexus-sdk";
import { useWalletClient } from "wagmi";

/**
 * Example/Demo Component showing how to use NexusFlowVisualizer
 * Demonstrates full bridge flow: Quote → Sign → Execute → Track
 */
export function NexusFlowExample() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Form state
  const [fromChain, setFromChain] = useState("sepolia");
  const [toChain, setToChain] = useState("polygon-amoy");
  const [token, setToken] = useState("USDC");
  const [amount, setAmount] = useState("100");

  // Bridge state
  const [quote, setQuote] = useState<any>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "executing" | "complete" | "error">(
    "idle"
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Initialize Nexus SDK with wallet provider
  useEffect(() => {
    if (!walletClient?.account) return;

    const initializeSDK = async () => {
      try {
        const bridge = getAvailNexusBridge();
        if (!bridge.isInitialized() && (window as any).ethereum) {
          await bridge.initialize((window as any).ethereum);
          console.log("Avail Nexus SDK initialized");
        }
      } catch (err) {
        console.error("Failed to initialize Nexus SDK:", err);
      }
    };

    initializeSDK();
  }, [walletClient?.account]);

  // Get quote
  const handleGetQuote = async () => {
    setStatus("loading");
    setError(null);

    try {
      const bridgeQuote = await requestBridgeQuote({
        fromChain,
        toChain,
        token,
        amount: parseFloat(amount),
      });

      setQuote(bridgeQuote);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get quote");
      setStatus("error");
    }
  };

  // Execute bridge using real Avail Nexus SDK
  const handleExecuteBridge = async () => {
    if (!quote || !address) {
      setError("No quote or wallet not connected");
      return;
    }

    setStatus("executing");
    setError(null);
    setProgress(0);

    try {
      const bridge = getAvailNexusBridge();

      // Chain ID mapping
      const chainIdMap: Record<string, number> = {
        "sepolia": 11155111,
        "polygon-amoy": 80002,
        "ethereum": 1,
        "polygon": 137,
        "arbitrum": 42161,
        "optimism": 10,
        "base": 8453,
      };

      const toChainId = chainIdMap[toChain.toLowerCase()];
      if (!toChainId) {
        throw new Error(`Unsupported chain: ${toChain}`);
      }

      // Set up progress tracking
      let unsubscribeProgress: (() => void) | null = null;
      unsubscribeProgress = bridge.onProgressStep((step) => {
        console.log('Progress step:', step);
        // Update progress based on step
        if (step.data?.explorerURL) {
          setTxHash(step.data.explorerURL);
        }
        // Estimate progress
        setProgress((prev) => Math.min(prev + 15, 90));
      });

      // Execute the bridge using Nexus SDK
      const result = await bridge.bridge({
        token: token.toUpperCase(),
        amount: parseFloat(amount),
        chainId: toChainId,
      });

      if (result.success) {
        setTxHash(result.hash || result.explorerUrl || "");
        setProgress(100);
        setStatus("complete");
      } else {
        throw new Error(result.error || "Bridge execution failed");
      }

      // Cleanup progress listener
      if (unsubscribeProgress) {
        unsubscribeProgress();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute bridge");
      setStatus("error");
      console.error("Bridge error:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h2 className="text-xl font-bold text-white mb-4">Bridge Configuration</h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* From Chain */}
          <div>
            <label className="text-sm text-slate-300 block mb-2">From Chain</label>
            <select
              value={fromChain}
              onChange={(e) => setFromChain(e.target.value)}
              disabled={status !== "idle"}
              className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 disabled:opacity-50"
            >
              <option value="sepolia">Sepolia (Testnet)</option>
              <option value="ethereum">Ethereum</option>
              <option value="polygon">Polygon</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="optimism">Optimism</option>
              <option value="base">Base</option>
            </select>
          </div>

          {/* To Chain */}
          <div>
            <label className="text-sm text-slate-300 block mb-2">To Chain</label>
            <select
              value={toChain}
              onChange={(e) => setToChain(e.target.value)}
              disabled={status !== "idle"}
              className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 disabled:opacity-50"
            >
              <option value="polygon-amoy">Polygon Amoy (Testnet)</option>
              <option value="ethereum">Ethereum</option>
              <option value="polygon">Polygon</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="optimism">Optimism</option>
              <option value="base">Base</option>
            </select>
          </div>

          {/* Token */}
          <div>
            <label className="text-sm text-slate-300 block mb-2">Token</label>
            <select
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={status !== "idle"}
              className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 disabled:opacity-50"
            >
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
              <option value="ETH">ETH</option>
              <option value="WETH">WETH</option>
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm text-slate-300 block mb-2">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={status !== "idle"}
              placeholder="100"
              className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Get Quote Button */}
        <button
          onClick={handleGetQuote}
          disabled={status !== "idle" || !address}
          className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold rounded-lg transition disabled:opacity-50"
        >
          {status !== "idle" ? "Processing..." : "Get Quote"}
        </button>

        {!address && (
          <p className="text-sm text-yellow-400 mt-3">
            💡 Connect your wallet to get started
          </p>
        )}
      </div>

      {/* Quote Display */}
      {quote && (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quote Details</h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-slate-400">Output Amount</p>
              <p className="text-lg font-semibold text-green-400">
                {quote.outputAmount.toFixed(4)} {token}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Gas Cost</p>
              <p className="text-lg font-semibold text-white">
                ${quote.gasCostUsd.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Est. Time</p>
              <p className="text-lg font-semibold text-white">
                {quote.estimatedTimeMinutes} min
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Bridge Fee</p>
              <p className="text-lg font-semibold text-white">
                {quote.bridgeFeePercent.toFixed(3)}%
              </p>
            </div>
          </div>

          <button
            onClick={handleExecuteBridge}
            disabled={status !== "idle"}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition disabled:opacity-50"
          >
            {status === "executing" ? "Bridge in Progress..." : "Execute Bridge"}
          </button>
        </div>
      )}

      {/* Visualization */}
      {quote && (
        <NexusFlowVisualizer
          fromChain={fromChain}
          toChain={toChain}
          token={token}
          amount={parseFloat(amount)}
          outputAmount={quote.outputAmount}
          gasCost={quote.gasCostUsd}
          estimatedTime={quote.estimatedTimeMinutes}
          status={status}
          txHash={txHash || undefined}
          progress={progress}
          errorMessage={error || undefined}
          onClose={() => {
            setQuote(null);
            setTxHash(null);
            setStatus("idle");
            setProgress(0);
            setError(null);
          }}
        />
      )}
    </div>
  );
}
