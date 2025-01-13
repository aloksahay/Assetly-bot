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

export interface PortfolioAssessment {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  diversificationScore: number;
  healthScore: number;
  summary: string;
}

export interface OpportunityAssessment {
  potentialGains: string[];
  risks: string[];
  suggestions: string[];
}

export interface StrategyRecommendation {
  actions: Array<{
    type: 'BUY' | 'SELL' | 'HOLD' | 'REBALANCE';
    asset?: string;
    reason: string;
  }>;
  timeframe: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
  summary: string;
} 