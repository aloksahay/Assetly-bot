export interface PortfolioAnalysis {
  assessment: string;
  opportunities: string[];
  strategy: string;
  timestamp: number;
  portfolioTokens: Record<string, any>;
  defiMarketData: {
    protocols: any[];
    aggregateStats: {
      totalTvl: number;
      avgApy: number;
      volumeUsd24h: number;
      avgBaseApy: number;
      avgRewardApy: number;
      totalProtocols: number;
    };
  };
}

export interface PortfolioValuation {
  positions: Array<{
    symbol: string;
    quantity: number;
    valueUSD: number;
    priceData?: {
      price: number;
      change24h: number;
      marketCap: number;
      volume24h: number;
    };
  }>;
  totalValueUSD: number;
  riskScore?: number;
  timestamp: number;
} 