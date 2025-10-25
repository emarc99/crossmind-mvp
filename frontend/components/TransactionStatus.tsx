"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { Loader, ExternalLink, Copy } from "lucide-react";
import { useBlockscoutNotification, getBlockscoutExplorerUrl, normalizeChainId, BlockscoutAttribution } from "@/components/BlockscoutSDK";

interface TransactionStatusProps {
  txHash: string;
  fromChain: string;
  toChain?: string;
}

const TransactionStatus: React.FC<TransactionStatusProps> = ({
  txHash,
  fromChain,
  toChain,
}) => {
  const [status, setStatus] = useState<any>(null);
  const [isTracking, setIsTracking] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<any>(null);
  const [checkingBridgeStatus, setCheckingBridgeStatus] = useState(false);

  // Blockscout SDK integration for enhanced notifications
  const { openTxToast } = useBlockscoutNotification();

  useEffect(() => {
    if (!isTracking) return;

    const trackTransaction = async () => {
      try {
        const result = await apiClient.trackTransaction(
          txHash,
          fromChain,
          toChain
        );
        setStatus(result);

        // Trigger Blockscout SDK notification on transaction submission
        // This integrates with Blockscout's transaction toast system
        if (!result.notified) {
          const chainId = normalizeChainId(fromChain);
          await openTxToast(chainId, txHash);
          // Mark as notified to avoid duplicate notifications
          result.notified = true;
        }

        // Stop tracking if complete or failed
        if (
          result.status === "success" ||
          result.status === "failed" ||
          result.overall_status === "completed" ||
          result.overall_status === "failed"
        ) {
          setIsTracking(false);
        }
      } catch (error) {
        console.error("Error tracking transaction:", error);
      }
    };

    trackTransaction();

    // Poll every 5 seconds
    const interval = setInterval(trackTransaction, 5000);
    return () => clearInterval(interval);
  }, [txHash, fromChain, toChain, isTracking, openTxToast]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(txHash);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const checkBridgeStatusOnRelayer = async () => {
    setCheckingBridgeStatus(true);
    try {
      const response = await fetch(
        `/api/bridge-status/${txHash}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json();
      setBridgeStatus(data);
    } catch (error) {
      console.error("Error checking bridge status:", error);
      setBridgeStatus({
        error: "Failed to check bridge status",
      });
    } finally {
      setCheckingBridgeStatus(false);
    }
  };

  const getBlockscoutUrl = (hash: string, chain: string) => {
    // Use Blockscout SDK utility for consistent explorer URLs
    const chainId = normalizeChainId(chain);
    return getBlockscoutExplorerUrl(hash, chainId);
  };

  if (!status) {
    return (
      <div className="flex justify-start">
        <div className="max-w-md w-full bg-slate-700/50 rounded-lg p-4 flex items-center gap-2">
          <Loader className="animate-spin text-blue-500" size={20} />
          <span className="text-sm text-gray-300">Loading transaction...</span>
        </div>
      </div>
    );
  }

  const progress = status.progress || 0;
  const message = status.message || "Processing...";
  const isComplete = progress === 100;
  const isFailed = status.status === "failed" || status.overall_status === "failed";

  return (
    <div className="flex justify-start">
      <div className="max-w-md w-full bg-slate-700/50 border border-slate-600 rounded-lg overflow-hidden backdrop-blur-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-4 py-3 border-b border-slate-600 flex items-center gap-2">
          {!isFailed && !isComplete && (
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
          )}
          {isComplete && (
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          )}
          {isFailed && (
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
          )}
          <h3 className="text-white font-semibold text-sm">
            {isComplete ? "Transaction Complete" : isFailed ? "Transaction Failed" : "Tracking Transaction"}
          </h3>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Status Message */}
          <div className="text-center">
            {isFailed && <div className="text-4xl mb-2">⚠️</div>}
            {isComplete && <div className="text-4xl mb-2">✓</div>}
            {!isFailed && !isComplete && (
              <div className="text-4xl mb-2 animate-pulse">⏳</div>
            )}
            <p className="text-gray-100 text-sm font-medium">{message}</p>
          </div>

          {/* Progress Bar */}
          {!isFailed && (
            <div className="space-y-2">
              <div className="w-full bg-slate-600/50 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-400 text-right">{progress}%</p>
            </div>
          )}

          {/* Chain Info */}
          <div className="bg-slate-600/30 rounded p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Source Chain</span>
              <span className="text-gray-100 font-medium">{fromChain.toUpperCase()}</span>
            </div>
            {toChain && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Destination Chain</span>
                <span className="text-gray-100 font-medium">{toChain.toUpperCase()}</span>
              </div>
            )}
            {status.confirmations && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Confirmations</span>
                <span className="text-gray-100 font-medium">
                  {status.confirmations}
                </span>
              </div>
            )}
            {status.estimated_time_remaining_minutes !== undefined &&
              !isComplete && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Est. Time</span>
                  <span className="text-blue-400 font-medium">
                    ~{status.estimated_time_remaining_minutes} min
                  </span>
                </div>
              )}
          </div>

          {/* TX Hash */}
          <div className="border-t border-slate-600 pt-3 space-y-2">
            <p className="text-xs text-gray-400">Transaction Hash</p>
            <div className="flex items-center gap-2 bg-slate-600/30 rounded p-2">
              <code className="text-xs text-gray-300 flex-1 truncate">
                {txHash}
              </code>
              <button
                onClick={copyToClipboard}
                title={isCopied ? "Copied!" : "Copy hash"}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>

          {/* Blockscout Link */}
          <a
            href={getBlockscoutUrl(txHash, fromChain)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-slate-600/30 hover:bg-slate-600/50 rounded px-3 py-2 text-sm text-blue-400 transition-colors"
          >
            View on Blockscout
            <ExternalLink size={14} />
          </a>

          {/* Check Bridge Status Button */}
          {toChain && (
            <button
              onClick={checkBridgeStatusOnRelayer}
              disabled={checkingBridgeStatus}
              className="w-full bg-purple-600/30 hover:bg-purple-600/50 disabled:opacity-50 rounded px-3 py-2 text-sm text-purple-300 transition-colors flex items-center justify-center gap-2"
            >
              {checkingBridgeStatus ? (
                <>
                  <Loader size={14} className="animate-spin" />
                  Checking relayer status...
                </>
              ) : (
                "Check Bridge Status"
              )}
            </button>
          )}

          {/* Bridge Status Display */}
          {bridgeStatus && (
            <div className="bg-purple-900/30 border border-purple-600/50 rounded p-3 space-y-2">
              <div className="flex items-center gap-2">
                {bridgeStatus.status === "completed" && (
                  <div className="text-green-400 text-sm font-semibold">✓ Completed</div>
                )}
                {bridgeStatus.status === "initiated" && (
                  <div className="text-blue-400 text-sm font-semibold">⏳ Initiated</div>
                )}
                {bridgeStatus.status === "unknown" && (
                  <div className="text-gray-400 text-sm font-semibold">? Unknown</div>
                )}
              </div>
              {bridgeStatus.data && bridgeStatus.data.amount_usdc && (
                <div className="text-xs text-gray-400">
                  Amount: {bridgeStatus.data.amount_usdc.toFixed(6)} USDC
                </div>
              )}
              {bridgeStatus.data && bridgeStatus.data.recipient && (
                <div className="text-xs text-gray-400 truncate">
                  Recipient: {bridgeStatus.data.recipient}
                </div>
              )}
              {bridgeStatus.data && bridgeStatus.data.completion_tx_hash && (
                <div className="text-xs text-purple-400 truncate">
                  Completion TX: {bridgeStatus.data.completion_tx_hash.slice(0, 20)}...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Blockscout SDK Attribution */}
        <BlockscoutAttribution />
      </div>
    </div>
  );
};

export default TransactionStatus;
