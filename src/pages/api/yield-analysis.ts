import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

interface YieldPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase?: number;
  apyReward?: number;
  apy: number;
  pool: string;
  apyPct30d?: number;
  volumeUsd24h?: number;
  il7d?: number;
  tvlUsdChange24h?: number;
  stablecoin?: boolean;
  ilRisk?: number;
  predictions?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tokens } = req.body;
    console.log('Analyzing yields for tokens:', tokens);

    // Fetch yield data from DeFi Llama
    console.log('Fetching data from DeFi Llama...');
    const response = await axios.get('https://yields.llama.fi/pools');
    console.log('DeFi Llama response received, total pools:', response.data.data.length);
    
    // Filter pools for our tokens and specific lending protocols
    const relevantPools = response.data.data
      .filter((pool: YieldPool) => {
        // Only include user's current chain
        const userChain = req.body.chainId === '0xaa36a7' ? 'Ethereum' : 'Unknown';
        const isCurrentChain = pool.chain === userChain;

        // Only include protocols supported by Brian
        const supportedProtocols = [
          'aave-v3',      // Only protocol currently supported by Brian for lending
        ];
        
        // Check if pool matches any of our tokens
        const isRelevantToken = tokens.some((token: string) => {
          // For ETH, we need to look for WETH in AAVE
          if (token === 'ETH' && pool.symbol === 'WETH') {
            return true;
          }
          // For LINK, check both LINK and Chainlink variations
          if (token === 'LINK' && (
            pool.symbol === 'LINK' || 
            pool.symbol === 'Chainlink' ||
            pool.symbol === 'CHAINLINK'
          )) {
            return true;
          }
          return token === pool.symbol;
        });
        
        const isSupported = supportedProtocols.includes(pool.project.toLowerCase());
        const hasMinimumTVL = pool.tvlUsd > 10000000; // $10M minimum TVL for safety
        const isRelevant = isRelevantToken && isSupported && isCurrentChain && hasMinimumTVL;
        
        if (isRelevantToken) {
          console.log('Checking pool:', {
            chain: pool.chain,
            userChain,
            isCurrentChain,
            protocol: pool.project,
            isSupported,
            tvl: pool.tvlUsd,
            apy: pool.apy,
            symbol: pool.symbol
          });
        }
        
        return isRelevant;
      })
      .map((pool: YieldPool) => {
        const mappedPool = {
          symbol: pool.symbol,
          protocol: pool.project,
          chain: pool.chain,
          supplyAPY: pool.apyBase ? pool.apyBase.toFixed(2) : '0.00',
          rewardAPY: pool.apyReward ? pool.apyReward.toFixed(2) : '0.00',
          totalAPY: pool.apy.toFixed(2),
          tvlUsd: (pool.tvlUsd / 1e6).toFixed(2),
          utilizationRate: '0.00',
          il7d: pool.il7d ? pool.il7d.toFixed(2) : '0.00',
          tvlChange24h: pool.tvlUsdChange24h ? pool.tvlUsdChange24h.toFixed(2) : '0.00',
          stablecoin: pool.stablecoin,
          ilRisk: pool.ilRisk,
          predictions: pool.predictions
        };
        console.log('Mapped pool:', mappedPool);
        return mappedPool;
      });

    console.log('Relevant pools found:', relevantPools.length);

    // Group by token and sort by APY, taking only top 2 non-zero APY pools
    const yieldsByToken = tokens.reduce((acc: any, token: string) => {
      const tokenPools = relevantPools
        .filter((pool: { symbol: string; totalAPY: any; }) => {
          // Filter pools for this token and ensure APY > 0
          const isMatchingToken = pool.symbol.toUpperCase().includes(token.toUpperCase());
          const hasYield = Number(pool.totalAPY) > 0;
          return isMatchingToken && hasYield;
        })
        .sort((a: { totalAPY: any; }, b: { totalAPY: any; }) => Number(b.totalAPY) - Number(a.totalAPY))
        .slice(0, 2); // Take only top 2 opportunities
      
      console.log(`Top pools found for ${token}:`, tokenPools.length);
      
      if (tokenPools.length > 0) {
        acc[token] = tokenPools;
      }
      return acc;
    }, {});

    console.log('Final top yields by token:', yieldsByToken);

    return res.status(200).json({
      yields: yieldsByToken,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Yield analysis error:', error);
    return res.status(500).json({ 
      error: 'Failed to analyze yields',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 