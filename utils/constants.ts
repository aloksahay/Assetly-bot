// Consolidate all constants
export const CHAIN_IDS = {
  'ethereum': 1,          // Mainnet fork
  'arbitrum': 421614,     // Arbitrum Sepolia
  'base': 84531          // Base Goerli
} as const;

export const RPC_URLS = {
  'ethereum': 'http://localhost:8545',  // Local fork
  'arbitrum': `https://arbitrum-sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
  'base': `https://base-goerli.infura.io/v3/${process.env.INFURA_API_KEY}`
} as const;

export type ChainId = typeof CHAIN_IDS[keyof typeof CHAIN_IDS];
export type ChainName = keyof typeof CHAIN_IDS; 