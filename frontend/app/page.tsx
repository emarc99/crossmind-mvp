"use client";

import React, { useState } from "react";
import { Brain, LogOut } from "lucide-react";
import ChatInterface from "@/components/ChatInterface";
import PortfolioView from "@/components/PortfolioView";
import { NexusFlowExample } from "@/components/nexus-visualizer/NexusFlowExample";
import { useWeb3 } from "@/lib/useWeb3";

export default function Page() {
  const [activeTab, setActiveTab] = useState<"chat" | "portfolio" | "bridge">("bridge");
  const { address, isConnected, chain, handleConnect, handleDisconnect, formatAddress } = useWeb3();

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Brain size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">CrossMind</h1>
              <p className="text-xs text-gray-400">AI Trading Assistant</p>
            </div>
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center gap-3">
            {isConnected && address ? (
              <>
                <div className="hidden sm:flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <span className="text-sm text-gray-300">
                    {formatAddress(address)}
                  </span>
                  {chain && (
                    <span className="text-xs text-gray-500 ml-2">
                      {chain.name}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg px-3 py-2 text-sm transition-colors"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Disconnect</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 font-medium transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0M15.92 5.08a7 7 0 00-9.84 0M13 10a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline">Connect Wallet</span>
                <span className="sm:hidden">Connect</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-slate-700 flex">
          <button
            onClick={() => setActiveTab("bridge")}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === "bridge"
                ? "text-cyan-400 border-b-2 border-cyan-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Bridge
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === "chat"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === "portfolio"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Portfolio
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {activeTab === "bridge" && (
          <div className="p-8 max-w-7xl mx-auto">
            <NexusFlowExample />
          </div>
        )}
        {activeTab === "chat" && (
          <ChatInterface userAddress={address || undefined} />
        )}
        {activeTab === "portfolio" && (
          <PortfolioView userAddress={address || undefined} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-800/50 px-4 py-3 text-center text-xs text-gray-500">
        Powered by Fetch.ai uAgents • Pyth Network • Avail Nexus • Blockscout
      </footer>
    </div>
  );
}
