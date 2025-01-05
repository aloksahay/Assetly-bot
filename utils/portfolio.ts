import { BrianSDK } from '@brian-ai/sdk';
import { CombinedPortfolio, TokenBalance, PortfolioPosition } from './types';

export class PortfolioService {
  private brian: BrianSDK;

  constructor() {
    this.brian = new BrianSDK({
      apiKey: process.env.BRIAN_API_KEY!
    });
  }

  async getPortfolio(address: string, chain: string): Promise<CombinedPortfolio> {
    // Only get data from Brian
    const brianData = await this.brian.ask({
      prompt: `What are the token balances and DeFi positions for ${address} on ${chain}?`,
      kb: "public-knowledge-box"
    });

    return {
      nativeToken: null, // We'll populate this from Brian's response
      tokens: [],       // We'll populate this from Brian's response
      defiPositions: this.formatDefiPositions(brianData)
    };
  }

  private formatDefiPositions(brianData: any): PortfolioPosition[] {
    if (!brianData) return [];
    
    try {
      console.log('Brian Response:', JSON.stringify(brianData, null, 2));
      return [];
    } catch (error) {
      console.error('Error parsing Brian response:', error);
      return [];
    }
  }
} 