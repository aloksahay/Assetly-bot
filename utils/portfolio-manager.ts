import { formatEther } from 'viem';
import { InfuraService } from './infura';
import { createBrianAgent } from "@brian-ai/langchain";
import { ChatOpenAI } from "@langchain/openai";

interface PortfolioStats {
  totalValue: number;
  assets: {
    token: string;
    balance: string;
    value: number;
    percentage: number;
  }[];
  yieldOpportunities: {
    protocol: string;
    apy: number;
    risk: 'low' | 'medium' | 'high';
  }[];
  riskMetrics: {
    diversificationScore: number;
    volatilityScore: number;
    overallRisk: 'low' | 'medium' | 'high';
  };
}

export class PortfolioManager {
  private infura: InfuraService;
  private agent: any | null = null;
  private lastScanTime: number = 0;
  private readonly SCAN_INTERVAL = 5 * 60 * 1000;

  constructor(
    private infuraApiKey: string,
    private brianApiKey: string,
    private agentPrivateKey: string,
    private openaiApiKey: string
  ) {
    this.infura = new InfuraService(infuraApiKey);
  }

  private async initializeAgent() {
    if (!this.agent) {
      this.agent = await createBrianAgent({
        apiKey: this.brianApiKey,
        privateKeyOrAccount: this.agentPrivateKey as `0x${string}`,
        llm: new ChatOpenAI({ apiKey: this.openaiApiKey }),
        metadata: {
          supportedProtocols: ["uniswap", "aave", "curve"],
          supportedChains: ["ethereum", "arbitrum", "optimism", "polygon", "base"]
        }
      });
    }
    return this.agent;
  }

  async analyzePortfolio(address: string, chain: string = 'ethereum'): Promise<PortfolioStats> {
    try {
      // Get basic wallet info
      const walletInfo = await this.infura.getWalletInfo(address, chain);

      // Get DeFi positions and opportunities using Brian Agent
      const defiAnalysis = await this.agent.invoke({
        input: `Analyze this wallet's DeFi positions and opportunities:
          Address: ${address}
          Chain: ${chain}
          Native Balance: ${walletInfo.nativeBalance}
          Token Balances: ${JSON.stringify(walletInfo.tokens)}
          
          Please provide:
          1. Total portfolio value in USD
          2. Best yield opportunities
          3. Risk assessment
          4. Optimization suggestions`,
        metadata: { address, chain }
      });

      // Get yield opportunities
      const yieldOpps = await this.agent.invoke({
        input: `Find the best yield opportunities for this portfolio:
          - Consider lending protocols (Aave, Compound)
          - Look at liquidity pools
          - Check staking options
          - Analyze risk/reward ratios`,
        metadata: { address, chain }
      });

      // Calculate risk metrics
      const riskAnalysis = await this.agent.invoke({
        input: `Assess the risk metrics for this portfolio:
          - Calculate diversification score
          - Analyze protocol exposure
          - Evaluate market risks
          - Consider correlation factors`,
        metadata: { address, chain }
      });

      // Format and return portfolio stats
      return {
        totalValue: 0, // Calculate from defiAnalysis
        assets: walletInfo.tokens.map(t => ({
          token: t.symbol || t.contractAddress,
          balance: t.tokenBalance,
          value: 0, // Calculate from defiAnalysis
          percentage: 0 // Calculate from total
        })),
        yieldOpportunities: [], // Parse from yieldOpps
        riskMetrics: {
          diversificationScore: 0, // Parse from riskAnalysis
          volatilityScore: 0, // Parse from riskAnalysis
          overallRisk: 'medium' // Parse from riskAnalysis
        }
      };
    } catch (error) {
      console.error('Portfolio analysis failed:', error);
      throw error;
    }
  }

  async getOptimizationSuggestions(address: string, chain: string = 'ethereum') {
    return this.agent.invoke({
      input: `Provide optimization suggestions for this portfolio:
        - Yield optimization opportunities
        - Risk reduction strategies
        - Gas efficiency improvements
        - Protocol-specific recommendations`,
      metadata: { address, chain }
    });
  }

  async monitorPositions(address: string, chain: string = 'ethereum') {
    const currentTime = Date.now();
    if (currentTime - this.lastScanTime < this.SCAN_INTERVAL) {
      return null;
    }

    try {
      const analysis = await this.analyzePortfolio(address, chain);
      this.lastScanTime = currentTime;
      return analysis;
    } catch (error) {
      console.error('Position monitoring failed:', error);
      throw error;
    }
  }
} 