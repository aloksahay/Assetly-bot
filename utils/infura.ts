import { formatEther, formatUnits, encodeFunctionData, parseAbi } from 'viem';
import fetch from 'node-fetch';

interface TokenInfo {
  address: string;
  chainId: number;
  decimals: number;
  symbol: string;
  name: string;
}

interface TokenBalance {
  token: TokenInfo;
  balance: string;
  valueUSD?: number;
}

const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)'
]);

const MULTICALL_ABI = [
  {
    name: 'aggregate',
    type: 'function',
    stateMutability: 'view',
    inputs: [{
      name: 'calls',
      type: 'tuple[]',
      components: [
        { name: 'target', type: 'address' },
        { name: 'callData', type: 'bytes' }
      ]
    }],
    outputs: [
      { name: 'blockNumber', type: 'uint256' },
      { name: 'returnData', type: 'bytes[]' }
    ]
  }
] as const;

const CHAIN_IDS = {
  'ethereum': 1,
  'polygon': 137,
  'arbitrum': 42161,
  'optimism': 10,
  'base': 8453
};

const MULTICALL_ADDRESSES = {
  'ethereum': '0xcA11bde05977b3631167028862bE2a173976CA11',
  'polygon': '0xcA11bde05977b3631167028862bE2a173976CA11',
  'arbitrum': '0xcA11bde05977b3631167028862bE2a173976CA11',
  'optimism': '0xcA11bde05977b3631167028862bE2a173976CA11',
  'base': '0xcA11bde05977b3631167028862bE2a173976CA11'
};

export class InfuraService {
  private tokenLists: { [chainId: number]: TokenInfo[] } = {};

  constructor(private apiKey: string) {
    this.initializeTokenLists();
  }

  private async initializeTokenLists() {
    try {
      // Fetch token lists for each chain
      const [mainnetTokens, polygonTokens] = await Promise.all([
        fetch('https://tokens.coingecko.com/uniswap/all.json').then(r => r.json()),
        fetch('https://raw.githubusercontent.com/maticnetwork/polygon-token-list/master/src/tokens.json').then(r => r.json())
      ]);

      // Initialize token lists by chain ID
      this.tokenLists = {
        [CHAIN_IDS.ethereum]: mainnetTokens.tokens,
        [CHAIN_IDS.polygon]: polygonTokens,
        // Add more token lists for other chains
      };
    } catch (error) {
      console.error('Failed to initialize token lists:', error);
    }
  }

  private getNetworkUrl(chain: string): string {
    const networkMap: { [key: string]: string } = {
      'ethereum': 'mainnet',
      'polygon': 'polygon-mainnet',
      'arbitrum': 'arbitrum-mainnet',
      'optimism': 'optimism-mainnet',
      'base': 'base-mainnet'
    };
    
    const network = networkMap[chain] || 'mainnet';
    return `https://${network}.infura.io/v3/${this.apiKey}`;
  }

  async getWalletInfo(address: string, chain: string = 'ethereum') {
    try {
      // Get native token balance
      const balanceResponse = await this.jsonRpcCall(chain, {
        method: 'eth_getBalance',
        params: [address, 'latest']
      });

      // Get token balances using multicall
      const chainId = CHAIN_IDS[chain as keyof typeof CHAIN_IDS];
      const tokens = this.tokenLists[chainId] || [];
      const tokenBalances = await this.getTokenBalances(address, tokens, chain);

      // Get token prices from CoinGecko (implement rate limiting)
      const tokenPrices = await this.getTokenPrices(tokens.map(t => t.address));

      // Calculate total value and format balances
      const formattedBalances = tokenBalances.map((balance, i) => ({
        token: tokens[i],
        balance: formatUnits(BigInt(balance), tokens[i].decimals),
        valueUSD: tokenPrices[tokens[i].address.toLowerCase()] || 0
      }));

      return {
        nativeBalance: formatEther(BigInt(balanceResponse.result)),
        tokens: formattedBalances.filter(t => parseFloat(t.balance) > 0)
      };
    } catch (error) {
      console.error('Infura API Error:', error);
      throw error;
    }
  }

  private async getTokenBalances(address: string, tokens: TokenInfo[], chain: string): Promise<string[]> {
    if (!tokens.length) return [];

    const multicallAddress = MULTICALL_ADDRESSES[chain as keyof typeof MULTICALL_ADDRESSES];
    
    // Prepare the calls array
    const calls = tokens.map(token => ({
      target: token.address as `0x${string}`,
      callData: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`]
      })
    }));

    // Make the multicall
    const response = await this.jsonRpcCall(chain, {
      method: 'eth_call',
      params: [{
        to: multicallAddress,
        data: encodeFunctionData({
          abi: MULTICALL_ABI,
          functionName: 'aggregate',
          args: [calls]
        })
      }, 'latest']
    });

    return response.result[1];
  }

  private async getTokenPrices(addresses: string[]): Promise<{ [address: string]: number }> {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${addresses.join(',')}&vs_currencies=usd`
      );
      return response.json();
    } catch (error) {
      console.error('Failed to fetch token prices:', error);
      return {};
    }
  }

  private async jsonRpcCall(chain: string, payload: any) {
    const url = this.getNetworkUrl(chain);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        ...payload
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }
} 