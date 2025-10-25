/**
 * useWeb3 Hook
 * Provides easy access to wallet connection state and methods
 */

"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useWeb3Modal } from "@web3modal/wagmi/react";

export function useWeb3() {
  const { address, isConnected, chain } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { open } = useWeb3Modal();

  const handleConnect = async () => {
    // Open Web3Modal dialog
    await open();
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const formatAddress = (addr: string | undefined) => {
    if (!addr) return null;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return {
    address,
    isConnected,
    chain,
    handleConnect,
    handleDisconnect,
    formatAddress,
    connectors,
    connect,
  };
}
