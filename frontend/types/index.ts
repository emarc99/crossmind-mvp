/**
 * Type Definitions for CrossMind
 */

export interface Intent {
  action: "bridge" | "swap" | "bridge_and_swap";
  from_chain: string;
  from_token: string;
  to_chain?: string;
  to_token?: string;
  amount: number;
  confidence: number;
  status: "success" | "error";
  error?: string;
  raw_message: string;
}

export interface RateQuote {
  quote_id: string;
  action: "bridge" | "swap" | "bridge_and_swap";
  from_chain?: string;
  from_token: string;
  to_chain?: string;
  to_token?: string;
  input_amount: number;
  output_amount: number;
  exchange_rate: number;
  gas_cost_usd: number;
  total_cost_usd: number;
  estimated_time_minutes?: number;
  slippage_pct?: number;
  route_details: string[];
  pyth_prices: Record<string, number>;
  status: "success" | "error";
  error?: string;
}

export interface ExecutionResult {
  status: "success" | "error";
  tx_hash?: string;
  quote_id: string;
  action: string;
  message: string;
  error?: string;
}

export interface TransactionStatus {
  tx_hash: string;
  status: "pending" | "success" | "failed";
  progress: number;
  message: string;
  estimated_time_remaining_minutes?: number;
  confirmations?: string;
  network?: string;
  error?: string;
}

export interface Balance {
  chain: string;
  chain_name: string;
  token: string;
  balance: number;
  price_usd: number;
  value_usd: number;
}

export interface Portfolio {
  address: string;
  balances: Balance[];
  total_usd: number;
  status: "success" | "error";
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  quote?: RateQuote;
  txHash?: string;
}
