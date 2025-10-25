"use client";

import React from "react";
import { ArrowRight, Network } from "lucide-react";

interface ChainNodeProps {
  chain: string;
  isSource: boolean;
  token: string;
  amount: number;
  isActive?: boolean;
}

/**
 * Chain Node Component
 * Represents a blockchain in the visualization
 */
export function ChainNode({
  chain,
  isSource,
  token,
  amount,
  isActive = false,
}: ChainNodeProps) {
  // Chain configuration with colors and icons
  const chainConfig: Record<
    string,
    { color: string; bgGradient: string; logo: string; name: string }
  > = {
    sepolia: {
      color: "from-blue-400 to-blue-600",
      bgGradient: "from-blue-900/20 to-blue-800/20",
      logo: "Ξ",
      name: "Sepolia",
    },
    "polygon-amoy": {
      color: "from-purple-400 to-purple-600",
      bgGradient: "from-purple-900/20 to-purple-800/20",
      logo: "◆",
      name: "Polygon Amoy",
    },
    ethereum: {
      color: "from-blue-400 to-blue-600",
      bgGradient: "from-blue-900/20 to-blue-800/20",
      logo: "Ξ",
      name: "Ethereum",
    },
    polygon: {
      color: "from-purple-400 to-purple-600",
      bgGradient: "from-purple-900/20 to-purple-800/20",
      logo: "◆",
      name: "Polygon",
    },
    arbitrum: {
      color: "from-cyan-400 to-blue-600",
      bgGradient: "from-cyan-900/20 to-blue-800/20",
      logo: "⬡",
      name: "Arbitrum",
    },
    optimism: {
      color: "from-red-400 to-orange-600",
      bgGradient: "from-red-900/20 to-orange-800/20",
      logo: "◊",
      name: "Optimism",
    },
    base: {
      color: "from-blue-400 to-cyan-600",
      bgGradient: "from-blue-900/20 to-cyan-800/20",
      logo: "⬢",
      name: "Base",
    },
  };

  const config = chainConfig[chain.toLowerCase()] || chainConfig.ethereum;

  return (
    <div
      className={`
        flex-shrink-0 w-40 p-4 rounded-lg border transition-all duration-300
        ${
          isActive
            ? `bg-gradient-to-br ${config.bgGradient} border-${config.color.split("-")[1]}-500/50 shadow-lg shadow-${config.color.split("-")[1]}-500/20`
            : "bg-slate-800/50 border-slate-700/50"
        }
      `}
    >
      {/* Chain Header */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`w-10 h-10 rounded-full bg-gradient-to-br ${config.color} flex items-center justify-center text-white font-bold text-lg`}
        >
          {config.logo}
        </div>
        <div className="flex-1">
          <p className="text-xs text-slate-400">Chain</p>
          <p className="text-sm font-semibold text-white">{config.name}</p>
        </div>
      </div>

      {/* Direction Badge */}
      <div className="mb-3">
        <span
          className={`
            inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
            ${isSource ? "bg-cyan-900/50 text-cyan-300" : "bg-purple-900/50 text-purple-300"}
          `}
        >
          {isSource ? (
            <>
              <ArrowRight size={12} />
              Source
            </>
          ) : (
            <>
              <Network size={12} />
              Destination
            </>
          )}
        </span>
      </div>

      {/* Amount Display */}
      <div className="bg-slate-900/50 rounded p-3">
        <p className="text-xs text-slate-400 mb-1">Amount</p>
        <p className="text-lg font-bold text-white mb-1">
          {amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          })}
        </p>
        <p className="text-sm text-slate-300 font-semibold">{token}</p>
      </div>

      {/* Status Indicator */}
      {isActive && (
        <div className="mt-3 flex items-center gap-2 text-xs text-cyan-400">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Active</span>
        </div>
      )}
    </div>
  );
}
