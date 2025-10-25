"use client";

import React from "react";
import { DollarSign, Clock, TrendingUp, Zap } from "lucide-react";

interface BridgeStatsProps {
  gasCost: number;
  bridgeFee: number;
  estimatedTime: number;
  exchangeRate: number;
  amountIn: number;
  amountOut: number;
}

/**
 * Bridge Statistics Component
 * Displays fees, gas costs, and other bridge transaction details
 */
export function BridgeStats({
  gasCost,
  bridgeFee,
  estimatedTime,
  exchangeRate,
  amountIn,
  amountOut,
}: BridgeStatsProps) {
  const slippage = ((amountIn - amountOut) / amountIn) * 100;
  const totalCost = gasCost; // In USD

  const StatCard = ({
    icon: Icon,
    label,
    value,
    unit,
    color,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    unit?: string;
    color: string;
  }) => (
    <div className="flex-1 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600/50 transition">
      <div className="flex items-center gap-2 mb-2">
        <div className={`${color} p-1.5 rounded text-white`}>{Icon}</div>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
      <p className="text-sm font-semibold text-white">
        {value}
        {unit && <span className="text-xs text-slate-400 ml-1">{unit}</span>}
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Zap size={16} />}
          label="Gas Cost"
          value={`$${gasCost.toFixed(2)}`}
          color="bg-yellow-600"
        />

        <StatCard
          icon={<TrendingUp size={16} />}
          label="Exchange Rate"
          value={exchangeRate.toFixed(4)}
          color="bg-green-600"
        />

        <StatCard
          icon={<Clock size={16} />}
          label="Est. Time"
          value={estimatedTime}
          unit="min"
          color="bg-blue-600"
        />

        <StatCard
          icon={<DollarSign size={16} />}
          label="Bridge Fee"
          value={`${bridgeFee.toFixed(3)}%`}
          color="bg-purple-600"
        />
      </div>

      {/* Detailed Breakdown */}
      <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
        <h4 className="text-sm font-semibold text-white mb-3">Transaction Details</h4>

        <div className="space-y-2.5">
          {/* Amount In */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-sm text-slate-300">Amount Sent</span>
            </div>
            <span className="text-sm font-semibold text-white">
              {amountIn.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}
            </span>
          </div>

          {/* Slippage/Fee */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="text-sm text-slate-300">Slippage & Fees</span>
            </div>
            <span className="text-sm font-semibold text-orange-400">
              -{(amountIn - amountOut).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}{" "}
              ({slippage.toFixed(2)}%)
            </span>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-700/50 my-2" />

          {/* Amount Out */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-sm text-slate-300 font-semibold">Amount Received</span>
            </div>
            <span className="text-sm font-bold text-green-400">
              {amountOut.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}
            </span>
          </div>

          {/* Gas Cost */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Network Gas Cost</span>
            <span>${gasCost.toFixed(2)}</span>
          </div>

          {/* Estimated Time */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Estimated Duration</span>
            <span>~{estimatedTime} minutes</span>
          </div>
        </div>
      </div>

      {/* Info Message */}
      <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <p className="text-xs text-blue-300">
          💡 Rates and times are estimates. Actual values may vary based on network conditions.
        </p>
      </div>
    </div>
  );
}
