"use client";

import React, { useState, useEffect } from "react";
import { ChainNode } from "./ChainNode";
import { FlowAnimation } from "./FlowAnimation";
import { BridgeStats } from "./BridgeStats";
import { TransactionTracker } from "./TransactionTracker";
import { AlertCircle, Check, Loader } from "lucide-react";

export interface NexusFlowProps {
  fromChain: string;
  toChain: string;
  token: string;
  amount: number;
  outputAmount?: number;
  gasCost?: number;
  bridgeFee?: number;
  estimatedTime?: number;
  status?: "idle" | "loading" | "executing" | "complete" | "error";
  txHash?: string;
  progress?: number; // 0-100
  errorMessage?: string;
  onClose?: () => void;
}

/**
 * Beautiful Nexus Flow Visualizer
 * Displays animated cross-chain token flow with real-time status tracking
 *
 * Features:
 * - Animated token flow between chains
 * - Chain node representations
 * - Real-time transaction tracking
 * - Fee and cost display
 * - Status indicators
 */
export function NexusFlowVisualizer({
  fromChain,
  toChain,
  token,
  amount,
  outputAmount = amount * 0.995,
  gasCost = 5.0,
  bridgeFee = 0.05,
  estimatedTime = 10,
  status = "idle",
  txHash,
  progress = 0,
  errorMessage,
  onClose,
}: NexusFlowProps) {
  const [displayProgress, setDisplayProgress] = useState(0);

  // Animate progress bar
  useEffect(() => {
    if (status === "executing" && progress > displayProgress) {
      const interval = setInterval(() => {
        setDisplayProgress((prev) => Math.min(prev + Math.random() * 15, progress));
      }, 500);
      return () => clearInterval(interval);
    } else if (status === "complete") {
      setDisplayProgress(100);
    }
  }, [status, progress, displayProgress]);

  const getStatusColor = () => {
    switch (status) {
      case "executing":
        return "from-blue-500 to-cyan-500";
      case "complete":
        return "from-green-500 to-emerald-500";
      case "error":
        return "from-red-500 to-orange-500";
      default:
        return "from-gray-500 to-slate-500";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "executing":
        return <Loader className="animate-spin" size={20} />;
      case "complete":
        return <Check size={20} />;
      case "error":
        return <AlertCircle size={20} />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "loading":
        return "Getting quote...";
      case "executing":
        return "Bridge in progress...";
      case "complete":
        return "Bridge complete!";
      case "error":
        return "Bridge failed";
      default:
        return "Ready to bridge";
    }
  };

  return (
    <div className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg border border-slate-700/50 p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
          Nexus Flow
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition"
          >
            ✕
          </button>
        )}
      </div>

      {/* Error Display */}
      {status === "error" && errorMessage && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle size={16} />
            <p className="text-sm">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Main Flow Visualization */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          {/* Source Chain */}
          <ChainNode
            chain={fromChain}
            isSource={true}
            token={token}
            amount={amount}
            isActive={status !== "idle"}
          />

          {/* Flow Animation */}
          <div className="flex-1 flex items-center justify-center">
            <FlowAnimation
              isActive={status === "executing"}
              progress={displayProgress}
              duration={estimatedTime}
            />
          </div>

          {/* Destination Chain */}
          <ChainNode
            chain={toChain}
            isSource={false}
            token={token}
            amount={outputAmount}
            isActive={status !== "idle" && status !== "loading"}
          />
        </div>

        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getStatusColor()}`} />
          <span className="flex items-center gap-2 text-sm font-medium">
            <span className={getStatusColor() === "from-green-500 to-emerald-500" ? "text-green-400" : "text-cyan-400"}>
              {getStatusText()}
            </span>
            {getStatusIcon() && <span className="text-cyan-400">{getStatusIcon()}</span>}
          </span>
        </div>

        {/* Progress Bar */}
        {(status === "executing" || status === "complete") && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-400">Progress</span>
              <span className="text-xs text-cyan-400 font-semibold">
                {Math.round(displayProgress)}%
              </span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getStatusColor()} transition-all duration-300`}
                style={{ width: `${displayProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bridge Statistics */}
      <BridgeStats
        gasCost={gasCost}
        bridgeFee={bridgeFee}
        estimatedTime={estimatedTime}
        exchangeRate={outputAmount / amount}
        amountIn={amount}
        amountOut={outputAmount}
      />

      {/* Transaction Tracker */}
      {txHash && (
        <div className="mt-6 border-t border-slate-700/50 pt-6">
          <TransactionTracker
            txHash={txHash}
            status={
              status === "executing"
                ? "pending"
                : status === "complete"
                  ? "confirmed"
                  : "pending"
            }
            fromChain={fromChain}
            toChain={toChain}
            progress={displayProgress}
            token={token}
            amount={amount}
          />
        </div>
      )}
    </div>
  );
}
