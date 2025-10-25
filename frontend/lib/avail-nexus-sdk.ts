/**
 * Avail Nexus SDK Wrapper
 * Real cross-chain bridge execution using Avail Nexus SDK
 */

import { NexusSDK, NEXUS_EVENTS, type ProgressStep, type NexusNetwork } from '@avail-project/nexus-core';

export class AvailNexusBridge {
  private sdk: NexusSDK | null = null;
  private initialized = false;

  /**
   * Initialize the Nexus SDK with wallet provider
   */
  async initialize(provider: any): Promise<void> {
    if (this.initialized) return;

    try {
      const sdk = new NexusSDK({
        network: 'testnet' as NexusNetwork
      });

      // Set required intent hook
      (sdk as any).setOnIntentHook(({ intent, allow }: any) => {
        console.log('Intent received:', intent);
        // Auto-approve intents for demo
        allow();
      });

      // Set required allowance hook
      (sdk as any).setOnAllowanceHook(({ allow, sources }: any) => {
        console.log('Allowance requested for sources:', sources);
        // Approve minimum allowance
        allow(['min']);
      });

      await (sdk as any).initialize(provider);
      this.sdk = sdk;
      this.initialized = true;

      console.log('Avail Nexus SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Nexus SDK:', error);
      throw error;
    }
  }

  /**
   * Get unified balances across all chains
   */
  async getUnifiedBalances(): Promise<any> {
    if (!this.sdk) throw new Error('SDK not initialized');
    try {
      return await (this.sdk as any).getUnifiedBalances();
    } catch (error) {
      console.error('Error getting balances:', error);
      throw error;
    }
  }

  /**
   * Execute a bridge transfer
   */
  async bridge(params: {
    token: string;
    amount: number;
    chainId: number;
  }): Promise<{ success: boolean; explorerUrl?: string; hash?: string; error?: string }> {
    if (!this.sdk) throw new Error('SDK not initialized');

    try {
      console.log('Executing bridge:', params);
      const result = await (this.sdk as any).bridge(params);

      return {
        success: result.success,
        explorerUrl: result.explorerUrl || result.transactionHash,
        hash: result.transactionHash || result.hash,
        error: result.error,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Bridge execution error:', errorMsg);

      // Check if it's an RPC rate limit error
      if (errorMsg.includes('Too Many Requests') || errorMsg.includes('rate limit')) {
        return {
          success: false,
          error: 'RPC rate limit exceeded. Please try again in a few moments or configure a custom RPC endpoint with API key (OnFinality, Alchemy, etc.)',
        };
      }

      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Subscribe to bridge execution events
   */
  onProgressStep(callback: (step: ProgressStep) => void): () => void {
    if (!this.sdk) throw new Error('SDK not initialized');

    try {
      const unsubscribe = (this.sdk as any).nexusEvents.on(
        NEXUS_EVENTS.BRIDGE_EXECUTE_COMPLETED_STEPS,
        callback
      );
      return () => unsubscribe?.();
    } catch (error) {
      console.error('Error subscribing to progress:', error);
      return () => {};
    }
  }

  /**
   * Subscribe to expected steps
   */
  onExpectedSteps(callback: (steps: ProgressStep[]) => void): () => void {
    if (!this.sdk) throw new Error('SDK not initialized');

    try {
      const unsubscribe = (this.sdk as any).nexusEvents.on(
        NEXUS_EVENTS.BRIDGE_EXECUTE_EXPECTED_STEPS,
        callback
      );
      return () => unsubscribe?.();
    } catch (error) {
      console.error('Error subscribing to expected steps:', error);
      return () => {};
    }
  }

  /**
   * Check if SDK is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance
let bridgeInstance: AvailNexusBridge | null = null;

export function getAvailNexusBridge(): AvailNexusBridge {
  if (!bridgeInstance) {
    bridgeInstance = new AvailNexusBridge();
  }
  return bridgeInstance;
}
