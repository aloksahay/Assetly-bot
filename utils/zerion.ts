import fetch from 'node-fetch';

interface ZerionPortfolio {
  nativeBalance: {
    amount: string;
    valueUSD: number;
  };
  tokens: {
    address: string;
    symbol: string;
    name: string;
    balance: string;
    valueUSD: number;
  }[];
  totalValueUSD: number;
}

export class ZerionService {
  private readonly API_URL = 'https://api.zerion.io/v1';
  
  // Add testnet chain mapping
  private readonly TESTNET_CHAINS = {
    'ethereum': 'goerli',
    'arbitrum': 'arbitrum-goerli',
    'base': 'base-goerli'
  } as const;

  constructor(private apiKey: string) {
    if (!apiKey) throw new Error('Zerion API key is required');
  }

  async getWalletPortfolio(address: string, chain?: string): Promise<ZerionPortfolio> {
    try {
      const url = new URL(`${this.API_URL}/wallets/${address}/positions`);
      
      // Map mainnet chain names to testnet names
      if (chain) {
        const testnetChain = this.TESTNET_CHAINS[chain as keyof typeof this.TESTNET_CHAINS];
        url.searchParams.append('filter[chain]', testnetChain);
      }
      
      url.searchParams.append('filter[min_value]', '1');
      url.searchParams.append('currency', 'usd');

      console.log('Fetching from Zerion:', url.toString());

      const response = await fetch(url.toString(), {
        headers: {
          'accept': 'application/json',
          'authorization': `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Zerion API error:', {
          status: response.status,
          statusText: response.statusText,
          data: errorData
        });
        throw new Error(`Zerion API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Raw Zerion response:', JSON.stringify(data, null, 2));
      
      // Format response
      const positions = data.data || [];
      let totalValueUSD = 0;
      let nativeToken = null;
      const tokens = [];

      for (const position of positions) {
        if (!position.attributes) {
          console.warn('Position missing attributes:', position);
          continue;
        }

        const { attributes } = position;
        const value = parseFloat(attributes.value || '0');
        totalValueUSD += value;

        // Check position type and format accordingly
        if (attributes.fungible_info && attributes.fungible_info.name) {
          // Handle fungible token
          if (attributes.fungible_info.implementations?.[0]?.address_name === 'ethereum') {
            // Native token
            nativeToken = {
              amount: attributes.quantity || '0',
              valueUSD: value
            };
          } else {
            // ERC20 token
            tokens.push({
              address: attributes.fungible_info.implementations?.[0]?.address || '',
              symbol: attributes.fungible_info.symbol || 'UNKNOWN',
              name: attributes.fungible_info.name || 'Unknown Token',
              balance: attributes.quantity || '0',
              valueUSD: value
            });
          }
        }
      }

      return {
        nativeBalance: nativeToken || { amount: '0', valueUSD: 0 },
        tokens: tokens.filter(t => t.address), // Filter out tokens without addresses
        totalValueUSD
      };

    } catch (error) {
      console.error('Zerion portfolio error:', error);
      throw error;
    }
  }

  // Optional: Get historical portfolio value
  async getPortfolioHistory(address: string, period: 'day' | 'week' | 'month' | 'year' = 'day') {
    const url = new URL(`${this.API_URL}/wallets/${address}/charts`);
    url.searchParams.append('currency', 'usd');
    url.searchParams.append('period', period);

    const response = await fetch(url.toString(), {
      headers: {
        'accept': 'application/json',
        'authorization': `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Zerion API error: ${response.status}`);
    }

    return response.json();
  }
} 