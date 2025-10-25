"use client";

import React, { useState, useEffect } from "react";
import { ExternalLink, Copy, Check } from "lucide-react";

interface TransactionTrackerProps {
  txHash: string;
  status: "pending" | "confirmed" | "complete";
  fromChain: string;
  toChain: string;
  progress: number; // 0-100
  token: string;
  amount: number;
}

/**
 * Transaction Tracker Component
 * Displays transaction hash, status, and provides explorer links
 */
export function TransactionTracker({
  txHash,
  status,
  fromChain,
  toChain,
  progress,
  token,
  amount,
}: TransactionTrackerProps) {
  const [copied, setCopied] = useState(false);

  // Copy to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get explorer URL
  const getExplorerUrl = (chain: string) => {
    const explorers: Record<string, string> = {
      ethereum: "https://etherscan.io/tx/",
      sepolia: "https://sepolia.etherscan.io/tx/",
      polygon: "https://polygonscan.com/tx/",
      "polygon-amoy": "https://amoy.polygonscan.com/tx/",
      arbitrum: "https://arbiscan.io/tx/",
      optimism: "https://optimistic.etherscan.io/tx/",
      base: "https://basescan.org/tx/",
    };
    return (explorers[chain.toLowerCase()] || "https://blockscout.com/tx/") + txHash;
  };

  const getStatusColor = () => {
    switch (status) {
      case "pending":
        return "from-yellow-500 to-orange-500";
      case "confirmed":
        return "from-blue-500 to-cyan-500";
      case "complete":
        return "from-green-500 to-emerald-500";
      default:
        return "from-gray-500 to-slate-500";
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case "pending":
        return "Pending";
      case "confirmed":
        return "Confirmed";
      case "complete":
        return "Complete";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="space-y-4">
      {/* Transaction Hash */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
        <h4 className="text-sm font-semibold text-slate-300 mb-3">Transaction Hash</h4>

        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-900 rounded p-3 font-mono text-xs text-cyan-300 break-all overflow-auto max-h-12">
            {txHash}
          </div>

          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              title="Copy hash"
              className="p-2 hover:bg-slate-700 rounded transition text-slate-400 hover:text-white"
            >
              {copied ? (
                <Check size={18} className="text-green-400" />
              ) : (
                <Copy size={18} />
              )}
            </button>

            <a
              href={getExplorerUrl(fromChain)}
              target="_blank"
              rel="noopener noreferrer"
              title="View on explorer"
              className="p-2 hover:bg-slate-700 rounded transition text-slate-400 hover:text-white"
            >
              <ExternalLink size={18} />
            </a>
          </div>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-300">Bridge Status</h4>

        <div className="space-y-2">
          {/* Source Chain Status */}
          <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
            <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${
              progress >= 33 ? "from-green-500 to-emerald-500" : "from-yellow-500 to-orange-500"
            }`} />

            <div className="flex-1">
              <p className="text-sm font-medium text-white">
                {fromChain.charAt(0).toUpperCase() + fromChain.slice(1)} Bridge Initiated
              </p>
              <p className="text-xs text-slate-400">
                Sending {amount.toLocaleString("en-US", { maximumFractionDigits: 4 })} {token}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs font-semibold text-slate-300">
                {progress >= 33 ? "✓ Complete" : "In Progress"}
              </p>
            </div>
          </div>

          {/* Bridging in Progress */}
          <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
            <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${
              progress >= 66 ? "from-green-500 to-emerald-500" : "from-gray-500 to-slate-500"
            }`} />

            <div className="flex-1">
              <p className="text-sm font-medium text-white">Bridging Funds</p>
              <p className="text-xs text-slate-400">
                Transferring assets via Avail Nexus
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs font-semibold text-slate-300">
                {progress > 33 && progress < 66 ? "In Progress" : progress >= 66 ? "✓ Complete" : "Pending"}
              </p>
            </div>
          </div>

          {/* Destination Chain Status */}
          <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
            <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${
              progress >= 90 ? "from-green-500 to-emerald-500" : "from-gray-500 to-slate-500"
            }`} />

            <div className="flex-1">
              <p className="text-sm font-medium text-white">
                {toChain.charAt(0).toUpperCase() + toChain.slice(1)} Confirmed
              </p>
              <p className="text-xs text-slate-400">
                Funds received on destination chain
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs font-semibold text-slate-300">
                {progress >= 90 ? "✓ Complete" : progress >= 66 ? "Confirming..." : "Pending"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Explorer Links */}
      <div className="pt-3 border-t border-slate-700/50 grid grid-cols-2 gap-2">
        <a
          href={getExplorerUrl(fromChain)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded transition text-sm text-slate-300 hover:text-white font-medium"
        >
          <ExternalLink size={14} />
          View Source
        </a>

        <a
          href={getExplorerUrl(toChain)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded transition text-sm text-slate-300 hover:text-white font-medium"
        >
          <ExternalLink size={14} />
          View Destination
        </a>
      </div>

      {/* Status Badge */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg border border-slate-600/50">
        <span className="text-sm text-slate-300">Overall Status</span>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${getStatusColor()}`}>
          {getStatusLabel()}
        </span>
      </div>
    </div>
  );
}
