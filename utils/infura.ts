import { formatEther, formatUnits, encodeFunctionData, parseAbi, decodeString, hexToString } from 'viem';
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

interface PortfolioValue {
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

const ERC20_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)'
]);

const MULTICALL_ABI = parseAbi([
  'function aggregate((address target, bytes callData)[] calls) view returns (uint256 blockNumber, bytes[] returnData)'
]);

const CHAIN_IDS = {
  'ethereum': 1,
  'arbitrum': 42161,
  'base': 8453
} as const;

const MULTICALL_ADDRESS = {
  'ethereum': '0xcA11bde05977b3631167028862bE2a173976CA11',
  'arbitrum': '0xcA11bde05977b3631167028862bE2a173976CA11',
  'base': '0xcA11bde05977b3631167028862bE2a173976CA11'
} as const;

const CHAIN_CONFIGS = {
  'ethereum': {
    explorer: 'https://api.etherscan.io',
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  'arbitrum': {
    explorer: 'https://api.arbiscan.io',
    apiKey: process.env.ARBISCAN_API_KEY
  },
  'base': {
    explorer: 'https://api.basescan.org',
    apiKey: process.env.BASESCAN_API_KEY
  }
} as const;

export class InfuraService {
  private tokenCache: { [key: string]: TokenInfo } = {};
  private requestQueue: Promise<any> = Promise.resolve();
  private lastRequestTime: number = 0;
  private readonly MIN_REQUEST_INTERVAL = 200;
  private readonly RATE_LIMIT_DELAY = 250; // 250ms between requests = 4 req/sec

  constructor(private apiKey: string) {}

  // Add rate limiting helper
  private async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      await new Promise(resolve => 
        setTimeout(resolve, this.RATE_LIMIT_DELAY - timeSinceLastRequest)
      );
    }
    this.lastRequestTime = Date.now();
  }

  async getWalletPortfolio(address: string, chain: string): Promise<PortfolioValue> {
    try {
      // 1. Get native balance
      await this.rateLimit();
      const balanceUrl = new URL('https://api.etherscan.io/v2/api');
      balanceUrl.searchParams.append('module', 'account');
      balanceUrl.searchParams.append('action', 'balance');
      balanceUrl.searchParams.append('address', address);
      balanceUrl.searchParams.append('tag', 'latest');
      balanceUrl.searchParams.append('chainid', CHAIN_IDS[chain as keyof typeof CHAIN_IDS].toString());
      balanceUrl.searchParams.append('apikey', process.env.ETHERSCAN_API_KEY!);

      const balanceResponse = await fetch(balanceUrl.toString());
      const balanceData = await balanceResponse.json();
      const nativeBalance = formatEther(BigInt(balanceData.result || '0'));

      // 2. Get token list
      await this.rateLimit();
      const tokenUrl = new URL('https://api.etherscan.io/v2/api');
      tokenUrl.searchParams.append('module', 'account');
      tokenUrl.searchParams.append('action', 'tokentx');
      tokenUrl.searchParams.append('address', address);
      tokenUrl.searchParams.append('chainid', CHAIN_IDS[chain as keyof typeof CHAIN_IDS].toString());
      tokenUrl.searchParams.append('apikey', process.env.ETHERSCAN_API_KEY!);
      tokenUrl.searchParams.append('sort', 'desc');
      tokenUrl.searchParams.append('page', '1');
      tokenUrl.searchParams.append('offset', '100');

      const tokenResponse = await fetch(tokenUrl.toString());
      const tokenData = await tokenResponse.json();

      // 3. Process tokens in batches
      const uniqueTokens = new Map();
      const tokens = tokenData.result || [];
      const BATCH_SIZE = 4; // Process 4 tokens at a time

      for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
        const batch = tokens.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async tx => {
          const tokenAddr = tx.contractAddress.toLowerCase();
          if (!uniqueTokens.has(tokenAddr)) {
            await this.rateLimit();
            const balanceUrl = new URL('https://api.etherscan.io/v2/api');
            balanceUrl.searchParams.append('module', 'account');
            balanceUrl.searchParams.append('action', 'tokenbalance');
            balanceUrl.searchParams.append('contractaddress', tokenAddr);
            balanceUrl.searchParams.append('address', address);
            balanceUrl.searchParams.append('tag', 'latest');
            balanceUrl.searchParams.append('chainid', CHAIN_IDS[chain as keyof typeof CHAIN_IDS].toString());
            balanceUrl.searchParams.append('apikey', process.env.ETHERSCAN_API_KEY!);

            const balanceResponse = await fetch(balanceUrl.toString());
            const balanceData = await balanceResponse.json();
            const balance = balanceData.result;

            if (BigInt(balance) > 0) {
              uniqueTokens.set(tokenAddr, {
                address: tokenAddr,
                symbol: tx.tokenSymbol,
                name: tx.tokenName,
                decimals: parseInt(tx.tokenDecimal),
                balance: formatUnits(balance, parseInt(tx.tokenDecimal))
              });
            }
          }
        }));
      }

      // 4. Get prices from CMC in one batch
      const tokenList = Array.from(uniqueTokens.values());
      if (tokenList.length > 0) {
        const cmcUrl = new URL('https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest');
        cmcUrl.searchParams.append('address', tokenList.map(t => t.address).join(','));
        cmcUrl.searchParams.append('convert', 'USD');

        const cmcResponse = await fetch(cmcUrl.toString(), {
          headers: {
            'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY!
          }
        });
        const cmcData = await cmcResponse.json();

        // Calculate values
        const tokenValues = tokenList.map(token => {
          const price = cmcData.data[token.address]?.quote?.USD?.price || 0;
          const valueUSD = parseFloat(token.balance) * price;
          return {
            ...token,
            valueUSD
          };
        }).filter(t => t.valueUSD >= 1);

        // Get native token price
        const nativePrice = await this.getNativeTokenPrice(chain);
        const nativeValueUSD = parseFloat(nativeBalance) * nativePrice;

        const totalValueUSD = tokenValues.reduce((sum, t) => sum + t.valueUSD, nativeValueUSD);

        return {
          nativeBalance: {
            amount: nativeBalance,
            valueUSD: nativeValueUSD
          },
          tokens: tokenValues,
          totalValueUSD
        };
      }

      // Return just native balance if no tokens found
      const nativePrice = await this.getNativeTokenPrice(chain);
      return {
        nativeBalance: {
          amount: nativeBalance,
          valueUSD: parseFloat(nativeBalance) * nativePrice
        },
        tokens: [],
        totalValueUSD: parseFloat(nativeBalance) * nativePrice
      };

    } catch (error) {
      console.error('Portfolio calculation error:', error);
      throw error;
    }
  }

  private async getNativeTokenPrice(chain: string): Promise<number> {
    // Get price from CMC or cache
    // Implementation depends on your needs
    return 2000; // Example ETH price
  }
} 