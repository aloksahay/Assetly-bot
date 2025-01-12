// Keep only this
export const NETWORK_CONFIG = {
  'Ethereum Sepolia': {
    chainId: '0xaa36a7',
    chainName: 'Sepolia',
    nativeCurrency: {
      name: 'Sepolia ETH',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: [`https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY}`],
    blockExplorerUrls: ['https://sepolia.etherscan.io']
  },
  'Arbitrum Sepolia': {
    chainId: '0x66eee',
    chainName: 'Arbitrum Sepolia',
    nativeCurrency: {
      name: 'Arbitrum Sepolia ETH',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://sepolia.arbiscan.io']
  }
};

export function getChainConfig(chainId: string) {
  const networks = Object.values(NETWORK_CONFIG);
  return networks.find(network => network.chainId === chainId);
}

export const STABLECOINS = ['USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'USDP']; 

// Common stablecoins and USD detection
export function isStablecoin(symbol: string): boolean {
  // Default known stablecoins
  const knownStablecoins = [
    'USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'USDP', 
    'aEthUSDC', 'SepoliaMNT', 'USDD', 'USDX'
  ];

  const upperSymbol = symbol.toUpperCase();
  
  return (
    // Check against known stablecoins
    knownStablecoins.includes(upperSymbol) ||
    // Check for USD in symbol
    upperSymbol.includes('USD') ||
    // Check for common wrapped/bridged stablecoin prefixes
    upperSymbol.startsWith('W') && upperSymbol.includes('USD') || // Wrapped
    upperSymbol.startsWith('B') && upperSymbol.includes('USD') || // Bridged
    upperSymbol.startsWith('A') && upperSymbol.includes('USD')    // Aave
  );
} 