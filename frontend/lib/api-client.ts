/**
 * API Client
 * Handles communication with the CrossMind backend
 */

import axios, { AxiosInstance } from "axios";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BACKEND_URL,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });
  }

  /**
   * Parse natural language message to extract trading intent
   */
  async parseIntent(message: string): Promise<any> {
    try {
      const response = await this.client.post("/parse", { message });
      return response.data;
    } catch (error) {
      console.error("Error parsing intent:", error);
      throw error;
    }
  }

  /**
   * Get rate quote for a trade
   */
  async getQuote(params: {
    action: string;
    from_chain: string;
    from_token: string;
    to_chain?: string;
    to_token?: string;
    amount: number;
  }): Promise<any> {
    try {
      const response = await this.client.post("/quote", params);
      return response.data;
    } catch (error) {
      console.error("Error getting quote:", error);
      throw error;
    }
  }

  /**
   * Execute a trade based on a confirmed quote
   */
  async executeTrade(params: {
    quote_id: string;
    user_address: string;
    confirmed: boolean;
  }): Promise<any> {
    try {
      const response = await this.client.post("/execute", params);
      return response.data;
    } catch (error) {
      console.error("Error executing trade:", error);
      throw error;
    }
  }

  /**
   * Track transaction status
   */
  async trackTransaction(
    txHash: string,
    fromChain: string,
    toChain?: string
  ): Promise<any> {
    try {
      const params: any = { from_chain: fromChain };
      if (toChain) params.to_chain = toChain;

      const response = await this.client.get(`/track/${txHash}`, { params });
      return response.data;
    } catch (error) {
      console.error("Error tracking transaction:", error);
      throw error;
    }
  }

  /**
   * Get unified portfolio balances
   */
  async getBalances(address: string): Promise<any> {
    try {
      const response = await this.client.get(`/balances/${address}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching balances:", error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async health(): Promise<any> {
    try {
      const response = await this.client.get("/health");
      return response.data;
    } catch (error) {
      console.error("Error checking health:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const apiClient = new APIClient();
