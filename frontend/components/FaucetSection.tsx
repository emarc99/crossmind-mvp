"use client";

import React from "react";
import { ExternalLink } from "lucide-react";

interface FaucetSectionProps {
  userAddress?: string;
}

export const FaucetSection: React.FC<FaucetSectionProps> = ({ userAddress }) => {
  if (!userAddress) {
    return null;
  }

  return (
    <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4 mb-4">
      <h3 className="text-sm font-semibold text-blue-200 mb-2">Need Testnet USDC?</h3>
      <p className="text-xs text-gray-300 mb-3">
        Get free testnet USDC on Sepolia from one of these faucets:
      </p>

      <div className="space-y-2">
        {/* Faucet Links */}
        <a
          href={`https://faucet.quicknode.com/drip?token=usdc_sepolia&address=${userAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-blue-300 hover:text-blue-100 transition"
        >
          <ExternalLink size={14} />
          <span>QuickNode Sepolia Faucet</span>
        </a>

        <a
          href={`https://www.alchemy.com/faucets/sepolia`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-blue-300 hover:text-blue-100 transition"
        >
          <ExternalLink size={14} />
          <span>Alchemy Sepolia Faucet (ETH)</span>
        </a>

        <a
          href={`https://sepoliafaucet.com/`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-blue-300 hover:text-blue-100 transition"
        >
          <ExternalLink size={14} />
          <span>Sepolia Faucet (ETH)</span>
        </a>

        <a
          href={`https://www.infura.io/faucet/sepolia`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-blue-300 hover:text-blue-100 transition"
        >
          <ExternalLink size={14} />
          <span>Infura Sepolia Faucet</span>
        </a>
      </div>

      <p className="text-xs text-gray-400 mt-3">
        💡 Tip: QuickNode faucet has native USDC support. Other faucets provide ETH which you can wrap to WETH.
      </p>
    </div>
  );
};
