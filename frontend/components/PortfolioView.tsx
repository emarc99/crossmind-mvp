"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw, Loader } from "lucide-react";
import { getAllBalances, formatTokenBalance } from "@/lib/all-balances";
import { fetchMultiplePrices } from "@/lib/price-fetcher";

interface TokenBalance {
  symbol: string;
  balance: number;
  address: string;
  decimals: number;
}

interface Chain {
  name: string;
  tokens: (TokenBalance & { usdValue: number; price: number })[];
  totalValue: number;
}

interface PortfolioData {
  chains: Chain[];
  totalValue: number;
  lastUpdated: number;
}

interface PortfolioViewProps {
  userAddress?: string;
}

const CHAIN_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Ethereum: { bg: "bg-blue-900/30", border: "border-blue-600/50", text: "text-blue-300" },
  Sepolia: { bg: "bg-blue-900/30", border: "border-blue-600/50", text: "text-blue-300" },
  Polygon: { bg: "bg-purple-900/30", border: "border-purple-600/50", text: "text-purple-300" },
  Arbitrum: { bg: "bg-orange-900/30", border: "border-orange-600/50", text: "text-orange-300" },
  Optimism: { bg: "bg-red-900/30", border: "border-red-600/50", text: "text-red-300" },
  Base: { bg: "bg-cyan-900/30", border: "border-cyan-600/50", text: "text-cyan-300" },
};

const CHAIN_ICONS: Record<string, string> = {
  Ethereum: "⟠",
  Sepolia: "⟠",
  Polygon: "◎",
  Arbitrum: "◆",
  Optimism: "●",
  Base: "◐",
};

export const PortfolioView: React.FC<PortfolioViewProps> = ({ userAddress }) => {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  const fetchPortfolioData = async () => {
    if (!userAddress) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch all balances from Sepolia (our test network)
      const balances = await getAllBalances(userAddress);

      // If no balances, show empty state
      if (balances.tokens.length === 0 && balances.eth === 0) {
        setPortfolio({
          chains: [
            {
              name: "Sepolia",
              tokens: [],
              totalValue: 0,
            },
          ],
          totalValue: 0,
          lastUpdated: Date.now(),
        });
        setLastUpdateTime(new Date());
        setLoading(false);
        return;
      }

      // Collect all unique symbols for price fetching
      const symbols = new Set<string>();
      symbols.add("ETH");
      balances.tokens.forEach((token) => {
        symbols.add(token.symbol);
      });

      // Fetch prices for all tokens
      const prices = await fetchMultiplePrices(Array.from(symbols));

      // Build portfolio structure
      const chains: Chain[] = [];
      let chainMap: Record<
        string,
        (TokenBalance & { usdValue: number; price: number })[]
      > = {
        Sepolia: [],
      };
      let totalPortfolioValue = 0;

      // Add ETH balance
      if (balances.eth > 0) {
        const ethPrice = prices["ETH"] || 0;
        const ethValue = balances.eth * ethPrice;
        chainMap["Sepolia"].push({
          symbol: "ETH",
          balance: balances.eth,
          address: "0x0000000000000000000000000000000000000000",
          decimals: 18,
          usdValue: ethValue,
          price: ethPrice,
        });
        totalPortfolioValue += ethValue;
      }

      // Add token balances
      balances.tokens.forEach((token) => {
        const tokenPrice = prices[token.symbol] || 0;
        const tokenValue = token.balance * tokenPrice;
        chainMap["Sepolia"].push({
          ...token,
          usdValue: tokenValue,
          price: tokenPrice,
        });
        totalPortfolioValue += tokenValue;
      });

      // Build chains array
      Object.entries(chainMap).forEach(([chainName, tokens]) => {
        if (tokens.length > 0) {
          const chainTotal = tokens.reduce((sum, token) => sum + token.usdValue, 0);
          chains.push({
            name: chainName,
            tokens: tokens.sort((a, b) => b.usdValue - a.usdValue), // Sort by USD value descending
            totalValue: chainTotal,
          });
        }
      });

      // Sort chains by total value
      chains.sort((a, b) => b.totalValue - a.totalValue);

      setPortfolio({
        chains,
        totalValue: totalPortfolioValue,
        lastUpdated: Date.now(),
      });
      setLastUpdateTime(new Date());
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      setPortfolio({
        chains: [],
        totalValue: 0,
        lastUpdated: Date.now(),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPortfolioData();

    // Set up auto-refresh every 10 minutes (600000 ms)
    const interval = setInterval(() => {
      if (!refreshing) {
        fetchPortfolioData();
      }
    }, 600000);

    return () => clearInterval(interval);
  }, [userAddress, refreshing]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPortfolioData();
  };

  const formatUSD = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!userAddress) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-2">Connect your wallet to view your portfolio</p>
          <p className="text-gray-500 text-sm">Your balances across all supported chains will appear here</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin text-blue-400 mx-auto mb-3" size={32} />
          <p className="text-gray-400">Loading your portfolio...</p>
        </div>
      </div>
    );
  }

  if (!portfolio || portfolio.chains.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-2">No balances found</p>
          <p className="text-gray-500 text-sm">Get testnet funds from a faucet to start</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">💼 Your Portfolio</h2>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg px-4 py-2 transition-colors"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Total Value */}
          <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-600/30 rounded-lg p-6 mb-4">
            <p className="text-gray-400 text-sm mb-1">Total Portfolio Value</p>
            <h3 className="text-3xl font-bold text-white">{formatUSD(portfolio.totalValue)}</h3>
            {lastUpdateTime && (
              <p className="text-gray-500 text-xs mt-2">
                Last updated: {getTimeAgo(lastUpdateTime)}
              </p>
            )}
          </div>
        </div>

        {/* Chains */}
        <div className="space-y-6">
          {portfolio.chains.map((chain) => {
            const colors = CHAIN_COLORS[chain.name] || CHAIN_COLORS["Ethereum"];
            const icon = CHAIN_ICONS[chain.name] || "⟠";

            return (
              <div key={chain.name} className={`${colors.bg} border ${colors.border} rounded-lg overflow-hidden`}>
                {/* Chain Header */}
                <div className={`${colors.text} px-6 py-4 border-b ${colors.border} bg-opacity-50`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{icon}</span>
                      <div>
                        <h4 className="font-semibold">{chain.name}</h4>
                        <p className="text-xs opacity-75">{chain.tokens.length} token{chain.tokens.length !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <p className="text-lg font-semibold">{formatUSD(chain.totalValue)}</p>
                  </div>
                </div>

                {/* Chain Tokens */}
                {chain.tokens.length > 0 ? (
                  <div className="divide-y divide-slate-700/50">
                    {chain.tokens.map((token) => (
                      <div
                        key={token.address}
                        className="px-6 py-4 hover:bg-white/5 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">{token.symbol[0]}</span>
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {formatTokenBalance(token.balance)} {token.symbol}
                            </p>
                            <p className="text-xs text-gray-400">
                              {token.price > 0 ? `$${token.price.toFixed(4)}` : "Price unavailable"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-white">{formatUSD(token.usdValue)}</p>
                          <p className="text-xs text-gray-400">
                            {portfolio.totalValue > 0
                              ? `${((token.usdValue / portfolio.totalValue) * 100).toFixed(1)}%`
                              : "0%"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-6 py-4 text-gray-400 text-sm">No balances on this chain</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="mt-8 p-4 bg-slate-700/30 border border-slate-600/50 rounded-lg text-center">
          <p className="text-gray-400 text-sm">
            💡 Balances are fetched from Sepolia testnet. Prices are from Pyth Network.
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Portfolio updates automatically every 10 minutes
          </p>
        </div>
      </div>
    </div>
  );
};

export default PortfolioView;
