"use client";

import React from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createWeb3Modal } from "@web3modal/wagmi/react";
import { config } from "@/lib/wagmi-config";

// Get your Project ID from https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "test-project-id";

// Create query client for caching
const queryClient = new QueryClient();

// Create Web3Modal instance
try {
  createWeb3Modal({
    wagmiConfig: config,
    projectId: projectId,
    enableAnalytics: true,
    enableOnramp: true,
    themeMode: "dark",
    themeVariables: {
      "--w3m-color-mix": "#3b82f6",
      "--w3m-color-mix-strength": 40,
    },
  });
} catch (error) {
  console.error("Failed to create Web3Modal:", error);
}

interface Web3ProviderProps {
  children: React.ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
