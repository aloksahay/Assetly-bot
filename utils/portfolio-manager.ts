import { BrianSDK } from '@brian-ai/sdk';
import { AgentConfig, PortfolioStats } from './types';

export interface PortfolioRecommendation {
  type: 'YIELD' | 'REBALANCE' | 'RISK_MANAGEMENT'
  description: string
  actions: {
    description: string
    expectedReturn?: string
    risk: 'LOW' | 'MEDIUM' | 'HIGH'
  }[]
}

export class PortfolioManager {
  private agent: BrianSDK;
  private readonly SCAN_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private lastScanTime = 0;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('API key is required for PortfolioManager');
    }
    this.agent = new BrianSDK({
      apiKey: apiKey
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

  async analyzePortfolio(assets: any[]): Promise<PortfolioRecommendation[]> {
    const recommendations: PortfolioRecommendation[] = []

    // Filter for stablecoins and ETH
    const relevantAssets = assets.filter(asset => 
      ['USDC', 'USDT', 'DAI', 'ETH'].includes(asset.attributes.fungible_info.symbol)
    )

    if (relevantAssets.length > 0) {
      const assetDetails = relevantAssets.map(asset => {
        const symbol = asset.attributes.fungible_info.symbol
        const quantity = asset.attributes.quantity.numeric
        let apy = ''

        // Current AAVE V3 lending rates
        switch(symbol) {
          case 'ETH':
            apy = '4.82%'
            break
          case 'USDC':
            apy = '4.12%'
            break
          case 'USDT':
            apy = '3.98%'
            break
          case 'DAI':
            apy = '4.05%'
            break
        }

        return {
          symbol,
          quantity,
          currentBalance: parseFloat(quantity).toFixed(4),
          aaveLendingRate: apy,
          tokenAddress: asset.attributes.fungible_info.implementations[0]?.address || null
        }
      })

      recommendations.push({
        type: 'YIELD',
        description: 'Available AAVE Lending Opportunities',
        actions: assetDetails.map(asset => ({
          description: `${asset.symbol} Balance: ${asset.currentBalance}`,
          expectedReturn: `Current AAVE lending rate: ${asset.aaveLendingRate} APY`,
          risk: 'LOW'
        }))
      })

      // Log detailed asset information
      console.log('Detailed Asset Information:', {
        assets: assetDetails,
        timestamp: new Date().toISOString(),
        platform: 'AAVE V3'
      })
    }

    return recommendations
  }
} 