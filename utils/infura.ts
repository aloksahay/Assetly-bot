import { formatEther, formatUnits } from 'viem';

// Keep only the types and constants we might need later
export const CHAIN_IDS = {
  'ethereum': 11155111,
  'arbitrum': 421614,
  'base': 84531
} as const;

export type ChainId = typeof CHAIN_IDS[keyof typeof CHAIN_IDS];
export type ChainName = keyof typeof CHAIN_IDS; 