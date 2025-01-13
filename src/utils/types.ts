// Shared types for both services
export interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
}

export interface PortfolioPosition {
  protocol: string;
  type: string;
  asset: string;
  amount: string;
}

export interface CombinedPortfolio {
  nativeToken: TokenBalance | null;
  tokens: TokenBalance[];
  defiPositions: PortfolioPosition[];
}

// Agent types
export interface AgentConfig {
  apiKey: string;
  privateKeyOrAccount: `0x${string}`;
  llm: any;
}

export interface AgentResponse {
  message: string;
  timestamp: string;
  isUser: boolean;
}

export interface PortfolioStats {
  totalValue: number;
  assets: {
    symbol: string;
    balance: string;
    value: number;
  }[];
  defiPositions: {
    protocol: string;
    type: string;
    asset: string;
    amount: string;
  }[];
} 