// Consolidate all constants
export const CHAIN_IDS = {
  'ethereum': 11155111, // Sepolia
  'arbitrum': 421614,   // Arbitrum Sepolia
  'base': 84531        // Base Goerli
} as const;

export const TESTNET_CHAINS = {
  'ethereum': 'sepolia',
  'arbitrum': 'arbitrum-sepolia',
  'base': 'base-goerli'
} as const;

export type ChainId = typeof CHAIN_IDS[keyof typeof CHAIN_IDS];
export type ChainName = keyof typeof CHAIN_IDS; 