import { TokenBalance, CombinedPortfolio } from './types';
import { TESTNET_CHAINS } from './constants';

export class ZerionService {
  private readonly API_URL = 'https://api.zerion.io/v1';

  constructor(private apiKey: string) {
    if (!apiKey) throw new Error('Zerion API key is required');
  }

  async getWalletPortfolio(address: string, chain?: string): Promise<CombinedPortfolio> {
    try {
      const url = this.buildPortfolioUrl(address);
      const response = await this.makeRequest(url);
      return this.formatPortfolioData(response);
    } catch (error) {
      console.error('Zerion portfolio error:', error);
      throw error;
    }
  }

  private buildPortfolioUrl(address: string): URL {
    const url = new URL(`${this.API_URL}/wallets/${address}/positions/`);
    url.searchParams.append('filter[positions]', 'no_filter');
    url.searchParams.append('currency', 'usd');
    url.searchParams.append('filter[trash]', 'no_filter');
    url.searchParams.append('sort', 'value');
    return url;
  }

  private async makeRequest(url: URL): Promise<any> {
    const response = await fetch(url.toString(), {
      headers: {
        'accept': 'application/json',
        'authorization': `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`,
        'X-Env': 'testnet'
      }
    });

    const data = await response.json();
    console.log('Zerion API response:', JSON.stringify(data, null, 2));
    return data;
  }

  private formatPortfolioData(data: any): CombinedPortfolio {
    const positions = data.data || [];
    let nativeToken = null;
    const tokens = [];

    for (const position of positions) {
      if (!position.attributes) continue;
      const { attributes } = position;
      
      const quantity = attributes.quantity?.numeric || '0';

      if (attributes.fungible_info && attributes.fungible_info.name) {
        const isNativeToken = attributes.fungible_info.implementations?.some(
          impl => impl.address === null && impl.chain_id.includes('sepolia')
        );

        if (isNativeToken && attributes.fungible_info.symbol === 'ETH') {
          nativeToken = {
            symbol: attributes.fungible_info.symbol,
            name: attributes.fungible_info.name,
            balance: quantity
          };
        } else {
          tokens.push({
            symbol: attributes.fungible_info.symbol || 'UNKNOWN',
            name: attributes.fungible_info.name || 'Unknown Token',
            balance: quantity
          });
        }
      }
    }

    return {
      nativeToken,
      tokens
    };
  }

  private processPosition(position: any, value: number, nativeToken: any, tokens: any[]) {
    const { attributes } = position;
    if (!attributes.fungible_info?.name) return;

    if (attributes.fungible_info.implementations?.[0]?.address_name === 'ethereum') {
      nativeToken = {
        amount: attributes.quantity || '0',
        valueUSD: value
      };
    } else {
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