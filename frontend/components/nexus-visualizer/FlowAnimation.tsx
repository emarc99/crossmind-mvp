"use client";

import React, { useEffect, useState } from "react";

interface FlowAnimationProps {
  isActive: boolean;
  progress: number; // 0-100
  duration?: number; // in minutes
}

/**
 * Flow Animation Component
 * Displays animated token flow between chains
 * Uses CSS animations for smooth performance
 */
export function FlowAnimation({
  isActive,
  progress = 0,
  duration = 10,
}: FlowAnimationProps) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    setDisplayProgress(progress);
  }, [progress]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 px-4">
      {/* Main Flow Container */}
      <div className="relative w-full h-12 bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-cyan-500/10" />

        {/* Progress Line */}
        <div className="absolute inset-y-0 left-0 top-0 h-full bg-gradient-to-r from-cyan-500/30 via-purple-500/30 to-cyan-500/30 transition-all duration-300"
          style={{ width: `${displayProgress}%` }}
        />

        {/* Animated Token (moving dot) */}
        {isActive && (
          <>
            {/* Trailing glow */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-cyan-500/20 blur-xl transition-all duration-300"
              style={{ left: `${displayProgress}%` }}
            />

            {/* Main token sphere */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 shadow-lg shadow-cyan-500/50 transition-all duration-300"
              style={{ left: `calc(${displayProgress}% - 8px)` }}
            >
              {/* Inner glow */}
              <div className="absolute inset-0 rounded-full bg-white/30 blur-sm animate-pulse" />
            </div>

            {/* Trailing particles */}
            {[0.3, 0.6, 0.9].map((offset, i) => (
              <div
                key={i}
                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-purple-400/40 transition-all duration-300"
                style={{
                  left: `calc(${displayProgress * offset}% - 3px)`,
                  opacity: 0.4 + (1 - offset) * 0.3,
                }}
              />
            ))}
          </>
        )}

        {/* Status Text Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-white drop-shadow-lg">
            {isActive ? (
              <>
                <span className="text-cyan-300">{Math.round(displayProgress)}%</span>
                <span className="text-slate-400 ml-1">bridging</span>
              </>
            ) : displayProgress === 100 ? (
              <span className="text-green-300">Complete</span>
            ) : (
              <span className="text-slate-400">Ready</span>
            )}
          </span>
        </div>
      </div>

      {/* Timeline Indicator */}
      <div className="w-full text-center">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>Start</span>
          <span>Progress</span>
          <span>Complete</span>
        </div>
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                displayProgress >= (i + 1) * 20
                  ? "bg-gradient-to-r from-cyan-500 to-purple-500"
                  : "bg-slate-700"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Status Messages */}
      {isActive && (
        <div className="text-center">
          <p className="text-xs text-cyan-300 font-medium">
            {displayProgress < 30
              ? "Initiating bridge..."
              : displayProgress < 60
                ? "Transferring funds..."
                : displayProgress < 90
                  ? "Finalizing transaction..."
                  : "Almost there..."}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Estimated {Math.max(0, Math.round((100 - displayProgress) * (duration / 100)))} min remaining
          </p>
        </div>
      )}

      {/* Error/Success State */}
      {displayProgress === 100 && (
        <div className="text-center">
          <p className="text-sm font-semibold text-green-400">✓ Bridge Complete</p>
          <p className="text-xs text-slate-400 mt-1">Funds received on destination chain</p>
        </div>
      )}
    </div>
  );
}
