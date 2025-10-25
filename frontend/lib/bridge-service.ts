/**
 * Bridge Service
 * Handles communication with backend API for bridge operations
 * Wraps Avail Nexus client functionality
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface BridgeQuoteRequest {
  fromChain: string;
  toChain: string;
  token: string;
  amount: number;
}

export interface BridgeQuote {
  quoteId: string;
  outputAmount: number;
  gasCostUsd: number;
  bridgeFeePercent: number;
  estimatedTimeMinutes: number;
  exchangeRate: number;
}

export interface ExecuteBridgeRequest {
  quoteId: string;
  fromChain: string;
  toChain: string;
  token: string;
  amount: number;
  recipientAddress: string;
  signedTxData: string;
}

export interface BridgeTransaction {
  txHash: string;
  quoteId: string;
  status: string;
  estimatedTimeMinutes: number;
}

export interface BridgeStatus {
  overallStatus: "bridging" | "complete" | "failed";
  progress: number;
  sourceConfirmed: boolean;
  destConfirmed: boolean;
  estimatedTimeRemainingMinutes: number;
  sourceTx: string;
  destTx?: string;
}

/**
 * Request a bridge quote from the backend
 */
export async function requestBridgeQuote(
  params: BridgeQuoteRequest
): Promise<BridgeQuote> {
  try {
    // Convert camelCase to snake_case for backend API
    const payload = {
      from_chain: params.fromChain,
      to_chain: params.toChain,
      token: params.token,
      amount: params.amount,
    };

    const response = await fetch(`${API_BASE}/api/bridge/quote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API error: ${response.status} - ${errorData.detail || ""}`);
    }

    const data = await response.json();

    // Convert snake_case response to camelCase
    return {
      quoteId: data.quote_id,
      outputAmount: data.output_amount,
      gasCostUsd: data.gas_cost_usd,
      bridgeFeePercent: data.bridge_fee_percent,
      estimatedTimeMinutes: data.estimated_time_minutes,
      exchangeRate: data.exchange_rate,
    };
  } catch (error) {
    console.error("Error requesting bridge quote:", error);
    throw error;
  }
}

/**
 * Execute a bridge transaction
 */
export async function executeBridge(
  params: ExecuteBridgeRequest
): Promise<BridgeTransaction> {
  try {
    // Convert camelCase to snake_case for backend API
    const payload = {
      quote_id: params.quoteId,
      from_chain: params.fromChain,
      to_chain: params.toChain,
      token: params.token,
      amount: params.amount,
      recipient_address: params.recipientAddress,
      signed_tx_data: params.signedTxData,
    };

    const response = await fetch(`${API_BASE}/api/bridge/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `API error: ${response.status}`);
    }

    const data = await response.json();

    // Convert snake_case response to camelCase
    return {
      txHash: data.tx_hash,
      quoteId: params.quoteId,
      status: data.status,
      estimatedTimeMinutes: data.estimated_time_minutes,
    };
  } catch (error) {
    console.error("Error executing bridge:", error);
    throw error;
  }
}

/**
 * Get the status of an ongoing bridge
 */
export async function getBridgeStatus(
  txHash: string,
  fromChain: string,
  toChain: string
): Promise<BridgeStatus> {
  try {
    const params = new URLSearchParams({
      tx_hash: txHash,
      from_chain: fromChain,
      to_chain: toChain,
    });

    const response = await fetch(
      `${API_BASE}/api/bridge/status?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting bridge status:", error);
    throw error;
  }
}

/**
 * Poll bridge status at intervals
 */
export function pollBridgeStatus(
  txHash: string,
  fromChain: string,
  toChain: string,
  onUpdate: (status: BridgeStatus) => void,
  onComplete: (status: BridgeStatus) => void,
  onError: (error: Error) => void,
  interval = 2000
): () => void {
  let isPolling = true;

  const poll = async () => {
    try {
      const status = await getBridgeStatus(txHash, fromChain, toChain);
      onUpdate(status);

      if (
        status.overallStatus === "complete" ||
        status.overallStatus === "failed"
      ) {
        onComplete(status);
        isPolling = false;
        return;
      }

      if (isPolling) {
        setTimeout(poll, interval);
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error("Unknown error"));
      isPolling = false;
    }
  };

  poll();

  // Return cleanup function
  return () => {
    isPolling = false;
  };
}

/**
 * Get route recommendation from agents
 */
export async function getRouteRecommendation(params: {
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  amount: number;
}) {
  try {
    const response = await fetch(`${API_BASE}/api/agent/recommend-route`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting route recommendation:", error);
    return null; // Return null if agent not available yet
  }
}

/**
 * Get risk assessment from agents
 */
export async function assessRisks(params: {
  fromChain: string;
  toChain: string;
  amount: number;
  token: string;
}) {
  try {
    const response = await fetch(`${API_BASE}/api/agent/assess-risks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error assessing risks:", error);
    return null; // Return null if agent not available yet
  }
}
