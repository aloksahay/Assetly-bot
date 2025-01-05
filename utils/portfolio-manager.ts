import { BrianSDK } from '@brian-ai/sdk';
import { AgentConfig, PortfolioStats } from './types';

export class PortfolioManager {
  private agent: BrianSDK;
  private readonly SCAN_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private lastScanTime = 0;

  constructor(config: AgentConfig) {
    this.agent = new BrianSDK({
      apiKey: config.apiKey
    });
  }

  async scanAndOptimize(address: string, chain: string): Promise<PortfolioStats | null> {
    const currentTime = Date.now();
    if (currentTime - this.lastScanTime < this.SCAN_INTERVAL) {
      return null;
    }

    try {
      const analysis = await this.agent.ask({
        prompt: `Analyze portfolio for ${address} on ${chain}. Include:
          1. Total portfolio value
          2. Asset allocation
          3. DeFi positions
          4. Yield opportunities`,
        kb: "public-knowledge-box"
      });

      this.lastScanTime = currentTime;
      return this.formatPortfolioStats(analysis);
    } catch (error) {
      console.error("Portfolio optimization failed:", error);
      return null;
    }
  }

  private formatPortfolioStats(analysis: any): PortfolioStats {
    return {
      totalValue: 0,
      assets: [],
      defiPositions: []
    };
  }
} 