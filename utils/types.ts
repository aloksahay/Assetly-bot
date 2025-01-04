// Move interfaces to a separate types file
export interface TokenInfo {
  symbol: string;
  name: string;
  balance: string;
}

export interface ZerionPortfolio {
  nativeToken: TokenInfo | null;
  tokens: TokenInfo[];
} 