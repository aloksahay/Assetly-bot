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

export function isStablecoin(symbol: string): boolean {
  const knownStablecoins = [
    'USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'USDP', 
    'aEthUSDC', 'SepoliaMNT', 'USDD', 'USDX'
  ];

  const upperSymbol = symbol.toUpperCase();
  
  return (
    knownStablecoins.includes(upperSymbol) ||
    upperSymbol.includes('USD') ||
    upperSymbol.startsWith('W') && upperSymbol.includes('USD') || // Wrapped
    upperSymbol.startsWith('B') && upperSymbol.includes('USD') || // Bridged
    upperSymbol.startsWith('A') && upperSymbol.includes('USD')    // Aave
  );
} 

export const SUPPORTED_TOKENS = {
  'ETH': {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    address: '0x0000000000000000000000000000000000000000' // Native ETH
  },
  'LINK': {
    symbol: 'LINK',
    name: 'Chainlink',
    decimals: 18,
    address: '0x779877A7B0D9E8603169DdbD7836e478b4624789' // Sepolia LINK address
  },
  'USDC': {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' // Sepolia USDC address
  }
}; 