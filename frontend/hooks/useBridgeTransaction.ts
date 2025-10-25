/**
 * Hook for handling bridge transaction signing and submission
 */

import { useCallback } from "react";

export interface BridgeTransactionParams {
  amount: number;
  fromChain: string;
  toChain: string;
  recipientAddress: string;
  quoteId: string;
}

export interface SignedTransaction {
  txHash: string;
  signedTx: string;
}

/**
 * Hook to sign and submit bridge transaction using wallet
 */
export function useBridgeTransaction() {
  const signAndSubmitBridge = useCallback(
    async (
      params: BridgeTransactionParams
    ): Promise<SignedTransaction | null> => {
      try {
        // Get provider and signer from window.ethereum (MetaMask, etc)
        if (!window.ethereum) {
          throw new Error("No wallet extension detected. Please install MetaMask.");
        }

        // Request account access
        const accounts = await (window.ethereum as any).request({
          method: "eth_requestAccounts",
        });

        if (!accounts || accounts.length === 0) {
          throw new Error("No accounts available in wallet");
        }

        const userAccount = accounts[0];

        // Build transaction object
        const txObject = {
          from: userAccount,
          to: "0x5f1f4e97b9fcf347c2f7ca18937bf50cc9b9a2f9", // Avail Bridge contract on Sepolia
          value: "0",
          data: "0x", // Would contain encoded bridge call in production
          chainId: 11155111, // Sepolia chain ID
          gasLimit: "500000",
        };

        // Request user to sign transaction
        console.log("Requesting wallet signature for transaction...", txObject);

        const signedTx = await (window.ethereum as any).request({
          method: "eth_signTransaction",
          params: [txObject],
        });

        if (!signedTx) {
          throw new Error("User rejected transaction signing");
        }

        console.log("Transaction signed:", signedTx);

        // Now submit the signed transaction to the backend
        const response = await fetch("http://localhost:8000/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quote_id: params.quoteId,
            user_address: userAccount,
            signed_tx: signedTx,
            confirmed: true,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || "Failed to submit transaction");
        }

        const result = await response.json();

        return {
          txHash: result.tx_hash,
          signedTx: signedTx,
        };
      } catch (error) {
        console.error("Error signing/submitting transaction:", error);
        throw error;
      }
    },
    []
  );

  return { signAndSubmitBridge };
}

// Extend window interface to include ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
