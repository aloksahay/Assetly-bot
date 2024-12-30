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

export class InfuraService {
  private tokenCache: { [key: string]: TokenInfo } = {};
  private requestQueue: Promise<any> = Promise.resolve();
  private lastRequestTime: number = 0;
  private readonly MIN_REQUEST_INTERVAL = 200;

  constructor(private apiKey: string) {}

  async getWalletInfo(address: string, chain: string = 'ethereum') {
    const startTime = Date.now();
    const timings: { [key: string]: number } = {};

    try {
      // Get native token balance
      const balanceStart = Date.now();
      const balanceResponse = await this.jsonRpcCall(chain, {
        method: 'eth_getBalance',
        params: [address, 'latest']
      });
      timings.nativeBalance = Date.now() - balanceStart;

      // Get token events
      const eventsStart = Date.now();
      const tokenTransfers = await this.getWalletTokens(address, chain);
      timings.tokenEvents = Date.now() - eventsStart;
      
      // Get token info
      const infoStart = Date.now();
      const tokenInfos = await this.getOrFetchTokenInfo(address, chain);
      timings.tokenInfo = Date.now() - infoStart;

      if (tokenInfos.length === 0) {
        return {
          nativeBalance: formatEther(BigInt(balanceResponse.result)),
          tokens: [],
          _debug: {
            timings,
            totalTime: Date.now() - startTime
          }
        };
      }

      // Get balances
      const balancesStart = Date.now();
      const tokenBalances = await this.getTokenBalances(address, tokenInfos, chain);
      timings.tokenBalances = Date.now() - balancesStart;

      // Ensure tokenBalances is an array
      const balancesArray = Array.isArray(tokenBalances) ? tokenBalances : [];

      // Get prices and filter by value
      const pricesStart = Date.now();
      const tokensWithBalance = balancesArray
        .map((balance, i) => ({ 
          balance: balance || '0x0', 
          token: tokenInfos[i] 
        }))
        .filter(({ balance }) => {
          try {
            return BigInt(balance) > 0;
          } catch {
            return false;
          }
        });

      const prices = await this.getTokenPrices(
        tokensWithBalance.map(t => t.token.address)
      );

      // Format and filter by USD value
      const formattedBalances = tokensWithBalance
        .map(({ balance, token }) => {
          try {
            const balanceFormatted = formatUnits(BigInt(balance), token.decimals);
            const priceUSD = prices[token.address.toLowerCase()]?.usd || 0;
            const valueUSD = parseFloat(balanceFormatted) * priceUSD;

            return {
              token,
              balance: balanceFormatted,
              valueUSD,
              _debug: { priceUSD }
            };
          } catch (error) {
            console.error('Error formatting balance:', error);
            return null;
          }
        })
        .filter((token): token is NonNullable<typeof token> => 
          token !== null && token.valueUSD >= 5
        );

      timings.prices = Date.now() - pricesStart;

      const totalTime = Date.now() - startTime;
      console.log('API Call Timings:', {
        ...timings,
        total: totalTime,
        timestamp: new Date().toISOString()
      });

      return {
        nativeBalance: formatEther(BigInt(balanceResponse.result)),
        tokens: formattedBalances,
        _debug: {
          timings,
          totalTime
        }
      };
    } catch (error) {
      const errorTime = Date.now() - startTime;
      console.error('Infura API Error:', error, {
        timings,
        totalTime: errorTime,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  private async getWalletTokens(address: string, chain: string): Promise<string[]> {
    // Get token transfer events for the wallet
    const logs = await this.jsonRpcCall(chain, {
      method: 'eth_getLogs',
      params: [{
        fromBlock: '0x0',
        toBlock: 'latest',
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // Transfer event
          null,
          `0x000000000000000000000000${address.slice(2).toLowerCase()}` // To address
        ]
      }]
    });

    // Extract unique token addresses
    return [...new Set(logs.result.map((log: any) => log.address.toLowerCase()))];
  }

  private async getOrFetchTokenInfo(address: string, chain: string): Promise<TokenInfo[]> {
    // Get token transfer events for the wallet
    const tokenTransfers = await this.getWalletTokens(address, chain);
    
    // Get unique token addresses
    const uniqueAddresses = [...new Set(tokenTransfers)];
    
    // Get info for all tokens at once using multicall
    try {
      const infos = await this.getTokenInfo(uniqueAddresses, chain);
      
      // Cache the results
      infos.forEach(info => {
        const cacheKey = `${chain}:${info.address}`;
        this.tokenCache[cacheKey] = info;
      });
      
      return infos;
    } catch (error) {
      console.error(`Failed to get token info:`, error);
      return [];
    }
  }

  private async getTokenInfo(addresses: string[], chain: string): Promise<TokenInfo[]> {
    try {
      // Split addresses into chunks of 50 to avoid URL length limits
      const CHUNK_SIZE = 50;
      const chunks = [];
      for (let i = 0; i < addresses.length; i += CHUNK_SIZE) {
        chunks.push(addresses.slice(i, i + CHUNK_SIZE));
      }

      const allTokenInfos: TokenInfo[] = [];

      // Process each chunk
      for (const chunk of chunks) {
        const addressList = chunk.map(addr => addr.toLowerCase()).join(',');

        // Build URL with correct aux parameters
        const url = new URL('https://pro-api.coinmarketcap.com/v1/cryptocurrency/info');
        url.searchParams.append('address', addressList);
        url.searchParams.append('aux', 'platform,status'); // Fixed aux parameters

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY!,
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          console.error('CMC API error for chunk:', {
            statusCode: response.status,
            chunk: addressList
          });
          continue; // Skip failed chunks but continue processing
        }

        const data = await response.json();
        
        // Process tokens from this chunk
        const chunkTokens = Object.values(data.data || {}).map((token: any) => ({
          address: token.platform?.token_address?.toLowerCase() || '',
          chainId: CHAIN_IDS[chain as keyof typeof CHAIN_IDS],
          decimals: token.platform?.token_decimals || 18,
          symbol: token.symbol || 'UNKNOWN',
          name: token.name || token.symbol || 'UNKNOWN'
        }));

        allTokenInfos.push(...chunkTokens);

        // Add delay between chunks to avoid rate limits
        await new Promise(r => setTimeout(r, 200));
      }

      // For any addresses that failed, use known tokens as fallback
      const foundAddresses = new Set(allTokenInfos.map(t => t.address.toLowerCase()));
      const missingAddresses = addresses.filter(addr => 
        !foundAddresses.has(addr.toLowerCase())
      );

      if (missingAddresses.length > 0) {
        const fallbackTokens = this.getKnownTokensInfo(missingAddresses, chain);
        allTokenInfos.push(...fallbackTokens);
      }

      return allTokenInfos;

    } catch (error) {
      console.error('Failed to get token info from CMC:', error);
      return this.getKnownTokensInfo(addresses, chain);
    }
  }

  // Helper method to get info for known tokens
  private getKnownTokensInfo(addresses: string[], chain: string): TokenInfo[] {
    return addresses.map(address => {
      const symbol = this.getKnownTokenSymbol(address) || 'UNKNOWN';
      return {
        address: address.toLowerCase(),
        chainId: CHAIN_IDS[chain as keyof typeof CHAIN_IDS],
        decimals: 18, // Default to 18 decimals
        symbol,
        name: symbol
      };
    });
  }

  // Add known token symbols
  private getKnownTokenSymbol(address: string): string | null {
    const knownTokens: { [address: string]: string } = {
      // Ethereum Mainnet
      '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',  // Tether USD
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',  // Wrapped Ether
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',  // USD Coin
      '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',   // Dai Stablecoin
      '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'WBTC',  // Wrapped Bitcoin
      '0x514910771af9ca656af840dff83e8264ecf986ca': 'LINK',  // Chainlink

      // Arbitrum
      '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': 'WETH',  // Wrapped Ether (Arbitrum)
      '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8': 'USDC',  // USD Coin (Arbitrum)
      '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': 'USDT',  // Tether USD (Arbitrum)
      '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f': 'WBTC',  // Wrapped Bitcoin (Arbitrum)

      // Base
      '0x4200000000000000000000000000000000000006': 'WETH',  // Wrapped Ether (Base)
      '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USDC',  // USD Coin (Base)
      '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': 'DAI',   // Dai Stablecoin (Base)
      '0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22': 'cbETH', // Coinbase Wrapped Staked ETH
      '0x27c77411074ba90ca35e6f92a79dad577c05a746': 'USDbC'  // USD Base Coin
    };

    return knownTokens[address.toLowerCase()] || null;
  }

  private getNetworkUrl(chain: string): string {
    const networkMap: { [key: string]: string } = {
      'ethereum': 'mainnet',
      'arbitrum': 'arbitrum-mainnet',
      'base': 'base-mainnet'
    };
    
    const network = networkMap[chain] || 'mainnet';
    return `https://${network}.infura.io/v3/${this.apiKey}`;
  }

  private async getTokenBalances(address: string, tokens: TokenInfo[], chain: string): Promise<string[]> {
    return Promise.all(
      tokens.map(async (token) => {
        try {
          const response = await this.jsonRpcCall(chain, {
            method: 'eth_call',
            params: [{
              to: token.address,
              data: encodeFunctionData({
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [address as `0x${string}`]
              })
            }, 'latest']
          });

          return response.result || '0x0';
        } catch (error) {
          console.error(`Failed to get balance for token ${token.address}:`, error);
          return '0x0';
        }
      })
    );
  }

  private decodeSymbol(hexData: string, address: string): string {
    // Try known tokens first
    const knownSymbol = this.getKnownTokenSymbol(address);
    if (knownSymbol) return knownSymbol;

    try {
      // Try decoding as string first
      return decodeString(hexData);
    } catch {
      try {
        // Try hex to string conversion
        if (typeof hexData === 'string') {
          const cleanHex = hexData.replace(/^0x/, '');
          if (cleanHex) {
            return hexToString(cleanHex).replace(/\0/g, '');
          }
        }
      } catch (error) {
        console.warn(`Failed to decode symbol for token ${address}:`, error);
      }
    }

    return 'UNKNOWN';
  }

  private async getTokenPrices(addresses: string[]) {
    const startTime = Date.now();
    if (!addresses.length) return {};

    try {
      const cleanAddresses = addresses
        .map(addr => addr.toLowerCase())
        .filter(addr => addr.startsWith('0x') && addr.length === 42);

      if (cleanAddresses.length === 0) return {};

      // Build URLs with query parameters and encoded comma
      const cmcUrl = new URL('https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest');
      cmcUrl.searchParams.append('address', cleanAddresses.join('%2C'));
      cmcUrl.searchParams.append('convert', 'USD');

      const [cmcPrice, defiLlamaPrice] = await Promise.allSettled([
        // CoinMarketCap Pro API (primary)
        fetch(cmcUrl.toString(), {
          method: 'GET',
          headers: {
            'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY!,
            'Accept': 'application/json'
          }
        }),
        // DeFiLlama as backup (no rate limits)
        fetch(`https://coins.llama.fi/prices/current/ethereum:${cleanAddresses.join(',ethereum:')}`)
      ]);

      const prices: { [key: string]: { usd: number } } = {};

      // Try CoinMarketCap first
      if (cmcPrice.status === 'fulfilled' && cmcPrice.value.ok) {
        const cmcData = await cmcPrice.value.json();
        if (cmcData.data) {
          Object.entries(cmcData.data).forEach(([addr, value]: [string, any]) => {
            prices[addr.toLowerCase()] = { 
              usd: value.quote.USD.price 
            };
          });
        }
      }

      // Fill missing prices from DeFiLlama
      if (defiLlamaPrice.status === 'fulfilled' && defiLlamaPrice.value.ok) {
        const llamaData = await defiLlamaPrice.value.json();
        Object.entries(llamaData.coins).forEach(([key, value]: [string, any]) => {
          const addr = key.split(':')[1].toLowerCase();
          if (!prices[addr]) {
            prices[addr] = { usd: value.price };
          }
        });
      }

      console.log('Price API Timings:', {
        cmc: cmcPrice.status === 'fulfilled' ? 'success' : 'failed',
        defillama: defiLlamaPrice.status === 'fulfilled' ? 'success' : 'failed',
        totalTime: Date.now() - startTime
      });
      return prices;
    } catch (error) {
      console.error('Price API Error:', {
        error,
        totalTime: Date.now() - startTime
      });
      return {};
    }
  }

  private async jsonRpcCall(chain: string, payload: any, retries = 3) {
    // Queue the request
    return new Promise((resolve, reject) => {
      this.requestQueue = this.requestQueue.then(async () => {
        // Ensure minimum time between requests
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
          await new Promise(r => setTimeout(r, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest));
        }
        this.lastRequestTime = Date.now();

        try {
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
            if (response.status === 429 && retries > 0) {
              // If rate limited, wait and retry
              await new Promise(r => setTimeout(r, 1000)); // Wait 1 second
              return this.jsonRpcCall(chain, payload, retries - 1);
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          resolve(data);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private async testSingleToken(address: string, chain: string) {
    try {
      const response = await this.jsonRpcCall(chain, {
        method: 'eth_call',
        params: [{
          to: address,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'symbol'
          })
        }, 'latest']
      });
      console.log(`Token ${address} response:`, response);
      return response;
    } catch (error) {
      console.error(`Token ${address} failed:`, error);
      return null;
    }
  }
} 