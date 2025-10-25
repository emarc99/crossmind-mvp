/**
 * Avail Nexus Client Wrapper
 * Handles real cross-chain token bridging and swapping via Avail Nexus
 * Supports Sepolia <-> Polygon Amoy (testnet) and mainnet chains
 */

import axios, { AxiosInstance } from 'axios';

// Supported chains configuration
export const SUPPORTED_CHAINS = {
  sepolia: {
    id: 11155111,
    name: 'Sepolia',
    symbol: 'ETH',
    decimals: 18,
    type: 'testnet',
  },
  'polygon-amoy': {
    id: 80002,
    name: 'Polygon Amoy',
    symbol: 'MATIC',
    decimals: 18,
    type: 'testnet',
  },
  ethereum: {
    id: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    type: 'mainnet',
  },
  polygon: {
    id: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    decimals: 18,
    type: 'mainnet',
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum',
    symbol: 'ARB',
    decimals: 18,
    type: 'mainnet',
  },
  optimism: {
    id: 10,
    name: 'Optimism',
    symbol: 'OP',
    decimals: 18,
    type: 'mainnet',
  },
  base: {
    id: 8453,
    name: 'Base',
    symbol: 'BASE',
    decimals: 18,
    type: 'mainnet',
  },
};

// Supported tokens
export const SUPPORTED_TOKENS = {
  USDC: { decimals: 6, mainnetAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' },
  USDT: { decimals: 6, mainnetAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7' },
  ETH: { decimals: 18, mainnetAddress: '0x0000000000000000000000000000000000000000' },
  WETH: { decimals: 18, mainnetAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' },
};

export interface BridgeQuote {
  quoteId: string;
  status: string;
  fromChain: string;
  toChain: string;
  token: string;
  amount: number;
  outputAmount: number;
  gasCostUsd: number;
  bridgeFeePercent: number;
  relayerFeeUsd: number;
  estimatedTimeMinutes: number;
  exchangeRate: number;
}

export interface BridgeTransaction {
  status: string;
  txHash: string;
  quoteId?: string;
  fromChain: string;
  toChain: string;
  token: string;
  amount: number;
  outputAmount: number;
  gasCostUsd: number;
  estimatedTimeMinutes: number;
  blockscoutUrl: string;
}

export interface BridgeStatus {
  sourceTx: string;
  sourceChain: string;
  sourceStatus: string;
  destChain: string;
  destTx?: string;
  destStatus: string;
  overallStatus: string;
  progress: number;
  estimatedTimeRemainingMinutes: number;
}

export interface RouteRecommendation {
  route: 'direct_bridge' | 'swap_then_bridge' | 'bridge_then_swap';
  reason: string;
  expectedOutput: number;
  gasCostUsd: number;
  estimatedTimeMinutes: number;
  confidence: number;
}

/**
 * Main Avail Nexus Client for executing real cross-chain transactions
 */
export class AvailNexusClient {
  private client: AxiosInstance;
  private apiBaseUrl: string;
  private network: 'testnet' | 'mainnet';

  constructor(network: 'testnet' | 'mainnet' = 'testnet', apiBaseUrl?: string) {
    this.network = network;
    this.apiBaseUrl = apiBaseUrl || this.getDefaultApiUrl();

    this.client = axios.create({
      baseURL: this.apiBaseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private getDefaultApiUrl(): string {
    if (this.network === 'testnet') {
      return 'https://testnet.api.nexus.avail.so/v1';
    }
    return 'https://api.nexus.avail.so/v1';
  }

  /**
   * Validate if a chain is supported
   */
  isChainSupported(chain: string): boolean {
    return chain.toLowerCase() in SUPPORTED_CHAINS;
  }

  /**
   * Validate if a token is supported
   */
  isTokenSupported(token: string): boolean {
    return token.toUpperCase() in SUPPORTED_TOKENS;
  }

  /**
   * Get bridge quote for a specific route
   */
  async getBridgeQuote(
    fromChain: string,
    toChain: string,
    token: string,
    amount: number
  ): Promise<BridgeQuote> {
    try {
      // Validate inputs
      if (!this.isChainSupported(fromChain)) {
        throw new Error(`Chain ${fromChain} is not supported`);
      }
      if (!this.isChainSupported(toChain)) {
        throw new Error(`Chain ${toChain} is not supported`);
      }
      if (!this.isTokenSupported(token)) {
        throw new Error(`Token ${token} is not supported`);
      }
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Call Avail Nexus API to get quote
      const response = await this.client.post('/quotes', {
        fromChainId: SUPPORTED_CHAINS[fromChain.toLowerCase()].id,
        toChainId: SUPPORTED_CHAINS[toChain.toLowerCase()].id,
        token: token.toUpperCase(),
        amount: amount.toString(),
      });

      return {
        quoteId: response.data.quoteId,
        status: 'success',
        fromChain,
        toChain,
        token: token.toUpperCase(),
        amount,
        outputAmount: response.data.outputAmount || amount * 0.995, // Account for ~0.5% fees
        gasCostUsd: response.data.gasCost || (fromChain.toLowerCase() === 'sepolia' ? 5.0 : 2.0),
        bridgeFeePercent: response.data.bridgeFeePercent || 0.05,
        relayerFeeUsd: response.data.relayerFee || 0.5,
        estimatedTimeMinutes: response.data.estimatedTime || 10,
        exchangeRate: (response.data.outputAmount || amount * 0.995) / amount,
      };
    } catch (error) {
      console.error('Error getting bridge quote:', error);
      throw error;
    }
  }

  /**
   * Execute a bridge transaction
   */
  async executeBridge(
    quoteId: string,
    fromChain: string,
    toChain: string,
    token: string,
    amount: number,
    recipientAddress: string,
    userSignedTxData: string // Signed transaction data from user's wallet
  ): Promise<BridgeTransaction> {
    try {
      // Validate inputs
      if (!quoteId || !fromChain || !toChain || !token || !amount || !recipientAddress) {
        throw new Error('Missing required parameters for bridge execution');
      }

      // Submit signed transaction to Avail Nexus
      const response = await this.client.post('/bridge/execute', {
        quoteId,
        fromChainId: SUPPORTED_CHAINS[fromChain.toLowerCase()].id,
        toChainId: SUPPORTED_CHAINS[toChain.toLowerCase()].id,
        token: token.toUpperCase(),
        amount: amount.toString(),
        recipient: recipientAddress,
        signedTxData: userSignedTxData,
      });

      const txHash = response.data.txHash;
      const gasCost = response.data.gasCost || 5.0;
      const outputAmount = response.data.outputAmount || amount * 0.995;

      return {
        status: 'success',
        txHash,
        quoteId,
        fromChain,
        toChain,
        token: token.toUpperCase(),
        amount,
        outputAmount,
        gasCostUsd: gasCost,
        estimatedTimeMinutes: response.data.estimatedTime || 10,
        blockscoutUrl: this.getBlockscoutUrl(fromChain, txHash),
      };
    } catch (error) {
      console.error('Error executing bridge:', error);
      throw error;
    }
  }

  /**
   * Check the status of an ongoing bridge transaction
   */
  async getBridgeStatus(
    txHash: string,
    fromChain: string,
    toChain: string
  ): Promise<BridgeStatus> {
    try {
      const response = await this.client.get('/bridge/status', {
        params: {
          txHash,
          fromChainId: SUPPORTED_CHAINS[fromChain.toLowerCase()].id,
          toChainId: SUPPORTED_CHAINS[toChain.toLowerCase()].id,
        },
      });

      return {
        sourceTx: txHash,
        sourceChain: fromChain,
        sourceStatus: response.data.sourceStatus || 'pending',
        destChain: toChain,
        destTx: response.data.destTx,
        destStatus: response.data.destStatus || 'pending',
        overallStatus: response.data.overallStatus || 'bridging',
        progress: response.data.progress || 50,
        estimatedTimeRemainingMinutes: response.data.estimatedTimeRemaining || 5,
      };
    } catch (error) {
      console.error('Error getting bridge status:', error);
      throw error;
    }
  }

  /**
   * Get recommended route based on current conditions
   * This will be enhanced with MeTTa-based reasoning from autonomous agents
   */
  async getRouteRecommendation(
    fromChain: string,
    toChain: string,
    fromToken: string,
    toToken: string,
    amount: number
  ): Promise<RouteRecommendation> {
    try {
      // For now, recommend direct bridge if tokens are the same
      if (fromToken === toToken) {
        return {
          route: 'direct_bridge',
          reason: `Direct bridge recommended: Same token (${fromToken}) on both chains`,
          expectedOutput: amount * 0.995,
          gasCostUsd: 5.0,
          estimatedTimeMinutes: 10,
          confidence: 0.95,
        };
      }

      // Otherwise recommend bridge then swap
      return {
        route: 'bridge_then_swap',
        reason: `Bridge ${fromToken} to ${toChain}, then swap to ${toToken}`,
        expectedOutput: amount * 0.990, // Account for ~1% total slippage
        gasCostUsd: 7.0, // Bridge + swap gas
        estimatedTimeMinutes: 15,
        confidence: 0.85,
      };
    } catch (error) {
      console.error('Error getting route recommendation:', error);
      throw error;
    }
  }

  /**
   * Get unified balances across all chains for an address
   * This will be enhanced with real data from blockchain RPCs and Blockscout
   */
  async getUnifiedBalances(address: string): Promise<any[]> {
    try {
      // Placeholder: would fetch from backend which queries all chains
      // For now return empty array, backend will implement this
      return [];
    } catch (error) {
      console.error('Error getting unified balances:', error);
      throw error;
    }
  }

  /**
   * Helper: Get Blockscout URL for a transaction
   */
  private getBlockscoutUrl(chain: string, txHash: string): string {
    const explorers: Record<string, string> = {
      ethereum: 'https://etherscan.io/tx/',
      sepolia: 'https://sepolia.etherscan.io/tx/',
      polygon: 'https://polygonscan.com/tx/',
      'polygon-amoy': 'https://amoy.polygonscan.com/tx/',
      arbitrum: 'https://arbiscan.io/tx/',
      optimism: 'https://optimistic.etherscan.io/tx/',
      base: 'https://basescan.org/tx/',
    };

    const baseUrl = explorers[chain.toLowerCase()] || 'https://blockscout.com/tx/';
    return `${baseUrl}${txHash}`;
  }
}

// Export singleton instance
export const availNexusClient = new AvailNexusClient('testnet');
