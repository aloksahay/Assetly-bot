import { NextApiRequest, NextApiResponse } from 'next';
import { ChatOpenAI } from "@langchain/openai";
import axios from 'axios';
import { ethers } from 'ethers';
import { isStablecoin } from '@/utils/constants';
import { getMockNews } from '@/utils/mockData';

interface TokenPosition {
  symbol: string;
  quantity: number;
  valueUSD?: number;
  priceData?: any;
}

interface PortfolioValuation {
  positions: TokenPosition[];
  totalValueUSD: number;
  riskScore?: number;
  timestamp: number;
}

interface PortfolioAssessment {
  assetDistribution: {
    [key: string]: {
      percentage: number;
      valueUSD: number;
    };
  };
  marketConditions: {
    [symbol: string]: {
      trend: string;
      priceChange24h: number;
      marketCap: number;
      volume24h: number;
    };
  };
  riskMetrics: {
    overallRisk: number;
    diversificationScore: number;
    volatilityScore: number;
  };
}

interface OpportunityAssessment {
  yieldOpportunities: Array<{
    protocol: string;
    asset: string;
    apy: number;
    tvl: number;
    risk: string;
    recommended: boolean;
  }>;
  tradingOpportunities: Array<{
    pair: string;
    type: 'SPOT' | 'LP' | 'LENDING';
    expectedReturn: number;
    confidence: number;
    timeframe: string;
  }>;
  liquidityPositions: Array<{
    pool: string;
    protocol: string;
    apr: number;
    ilRisk: number;
    recommendation: string;
  }>;
}

interface StrategyRecommendation {
  rebalancing: Array<{
    asset: string;
    currentAllocation: number;
    targetAllocation: number;
    action: 'BUY' | 'SELL' | 'HOLD';
    amount: number;
  }>;
  yieldStrategy: Array<{
    asset: string;
    protocol: string;
    amount: number;
    expectedYield: number;
    steps: string[];
  }>;
  riskMitigation: Array<{
    type: string;
    action: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    rationale: string;
  }>;
}

// Add DeFiLlama interfaces
interface YieldPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase?: number;
  apyReward?: number;
  apy: number;
  rewardTokens?: string[];
  pool: string;
  apyPct30d?: number;
  volumeUsd24h?: number;
  il7d?: number;
  tvlUsdChange24h?: number;
}

interface Protocol {
  id: string;
  name: string;
  address?: string;
  symbol: string;
  url: string;
  description: string;
  chain: string;
  tvl: number;
  change_1h: number;
  change_1d: number;
  change_7d: number;
  staking: number;
  fdv: number;
  mcap: number;
}

interface TokenPrice {
  decimals: number;
  price: number;
  symbol: string;
  timestamp: number;
  confidence: number;
}

interface MarketData {
  protocols: Protocol[];
  aggregateStats: {
    totalTvl: number;
    avgApy: number;
    volumeUsd24h: number;
    avgBaseApy: number;
    avgRewardApy: number;
    totalProtocols: number;
  };
  prices: Record<string, TokenPrice>;
}

// Add new interface for ETH market analysis
interface ETHMarketAnalysis {
  currentPrice: number;
  priceChange24h: number;
  priceChange7d: number;
  marketMetrics: {
    totalValueLocked: number;
    tvlChange24h: number;
    dominance: number;
    yields: {
      avgLendingAPY: number;
      avgLPAPY: number;
      bestYieldOpp: {
        protocol: string;
        apy: number;
        tvl: number;
        risk: string;
      };
    };
  };
  recommendation: {
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reasoning: string;
    suggestedEntry?: number;
    suggestedExit?: number;
  };
}

// Add interface for news sentiment analysis
interface NewsSentiment {
  symbol: string;
  sentiment: number;  // -1.5 to +1.5
  events: Array<{
    title: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    source: string;
    url: string;
    timestamp: string;
  }>;
  trendingHeadlines: string[];
  summary: string;
}

interface MarketSentiment {
  overallSentiment: number;
  tokenSentiments: Record<string, NewsSentiment>;
  topEvents: Array<{
    title: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    tokens: string[];
  }>;
  marketSummary: string;
}

// Add interface for general market news
interface GeneralMarketNews {
  majorEvents: Array<{
    title: string;
    summary: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    affectedSectors: string[];
    timestamp: string;
    source: string;
    url: string;
  }>;
  volatilityIndicators: Array<{
    event: string;
    probability: number;
    timeframe: string;
    potentialImpact: number;
  }>;
  marketMoods: {
    overall: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    defi: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    nft: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    layer1: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
}

// First, let's define clearer interfaces for our flow
interface PortfolioScan {
  tokens: {
    symbol: string;
    quantity: number;
    valueUSD: number;
    isStablecoin: boolean;
    priceData?: {
      price: number;
      change24h: number;
      marketCap: number;
      volume24h: number;
    };
  }[];
  totalValue: number;
  timestamp: number;
}

interface MarketNewsAnalysis {
  generalMarket: {
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    score: number; // -1.5 to 1.5
    majorEvents: Array<{
      title: string;
      summary: string;
      impact: 'HIGH' | 'MEDIUM' | 'LOW';
      relevantTokens?: string[];
      timestamp: string;
    }>;
    keyMetrics: {
      volatilityLevel: 'HIGH' | 'MEDIUM' | 'LOW';
      marketMomentum: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
      riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    };
  };
  portfolioTokens: Record<string, {
    news: Array<{
      title: string;
      sentiment: 'positive' | 'negative' | 'neutral';
      relevance: number;
      source: string;
      url: string;
      timestamp: string;
    }>;
    analysis: {
      sentiment: number;
      riskFactors: string[];
      opportunities: string[];
      recommendation: 'HOLD' | 'SELL' | 'BUY' | 'WATCH';
    };
  }>;
  summary: {
    overview: string;
    risks: string[];
    opportunities: string[];
    actionItems: string[];
  };
}

interface NewsItem {
  news_url: string;
  image_url: string;
  title: string;
  text: string;
  source_name: string;
  date: string;
  topics: string[];
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  type: string;
}

interface NewsResponse {
  data: NewsItem[];
  total_pages: number;
  total_items: number;
}

// Function to fetch DeFi protocol data from DeFiLlama
async function getDeFiMarketData(tokens: string[]): Promise<MarketData> {
  try {
    // Parallel API calls for better performance
    const [yieldsResponse, protocolsResponse, pricesResponse] = await Promise.all([
      axios.get('https://yields.llama.fi/pools'),
      axios.get('https://api.llama.fi/protocols'),
      axios.get(`https://coins.llama.fi/prices/current/${tokens.map(t => `ethereum:${t}`).join(',')}`)
    ]);

    // Validate responses
    if (!yieldsResponse.data?.data) {
      throw new Error('Invalid yields response from DeFiLlama');
    }

    if (!protocolsResponse.data) {
      throw new Error('Invalid protocols response from DeFiLlama');
    }

    if (!pricesResponse.data?.coins) {
      throw new Error('Invalid prices response from DeFiLlama');
    }

    // Type the responses with validation
    const pools: YieldPool[] = yieldsResponse.data.data || [];
    const protocols: Protocol[] = protocolsResponse.data || [];
    const prices: Record<string, TokenPrice> = pricesResponse.data.coins || {};

    // Filter relevant pools with validation
    const relevantPools = pools.filter(pool => 
      pool && // Ensure pool exists
      tokens.some(token => pool.symbol?.toUpperCase().includes(token.toUpperCase())) &&
      pool.tvlUsd > 100000
    );

    // Map to our protocol data structure with validation
    const protocolData = relevantPools.map(pool => ({
      tvl: pool.tvlUsd || 0,
      apy: pool.apy || 0,
      symbol: pool.symbol || '',
      pool: pool.pool || '',
      project: pool.project || '',
      chain: pool.chain || '',
      apyPct30d: pool.apyPct30d || 0,
      volumeUsd24h: pool.volumeUsd24h || 0,
      stablecoin: (pool.symbol || '').includes('USD') || (pool.symbol || '').includes('DAI'),
      ilRisk: calculateILRisk(pool.il7d),
      exposure: [pool.chain || 'unknown'],
      baseApy: pool.apyBase || 0,
      rewardApy: pool.apyReward || 0,
      tvlChange24h: pool.tvlUsdChange24h || 0,
      rewardTokens: pool.rewardTokens || []
    }));

    // Get protocol details with validation
    const protocolDetails = protocolData.map(pool => {
      const protocol = protocols.find(p => 
        p.name?.toLowerCase() === pool.project.toLowerCase()
      );
      return {
        ...pool,
        protocolTvl: protocol?.tvl || 0,
        protocolChange24h: protocol?.change_1d || 0,
        protocolChange7d: protocol?.change_7d || 0
      };
    });

    // Calculate aggregate stats with validation
    const validProtocols = protocolDetails.filter(p => p.tvl > 0);
    const aggregateStats = {
      totalTvl: validProtocols.reduce((sum, p) => sum + p.tvl, 0),
      avgApy: validProtocols.length > 0 
        ? validProtocols.reduce((sum, p) => sum + p.apy, 0) / validProtocols.length 
        : 0,
      volumeUsd24h: validProtocols.reduce((sum, p) => sum + (p.volumeUsd24h || 0), 0),
      avgBaseApy: validProtocols.length > 0
        ? validProtocols.reduce((sum, p) => sum + p.baseApy, 0) / validProtocols.length
        : 0,
      avgRewardApy: validProtocols.length > 0
        ? validProtocols.reduce((sum, p) => sum + p.rewardApy, 0) / validProtocols.length
        : 0,
      totalProtocols: new Set(validProtocols.map(p => p.project)).size
    };

    // Log the data for debugging
    console.log('DeFiLlama Market Data:', {
      protocolsCount: protocolDetails.length,
      aggregateStats,
      pricesCount: Object.keys(prices).length
    });

    return {
      protocols: protocolDetails,
      aggregateStats,
      prices
    };
  } catch (error) {
    console.error('DeFiLlama API error:', error);
    // Return default values instead of throwing
    return {
      protocols: [],
      aggregateStats: {
        totalTvl: 0,
        avgApy: 0,
        volumeUsd24h: 0,
        avgBaseApy: 0,
        avgRewardApy: 0,
        totalProtocols: 0
      },
      prices: {}
    };
  }
}

// Helper function to calculate IL risk based on volatility
function calculateILRisk(volatility30d?: number): string {
  if (!volatility30d) return 'UNKNOWN';
  if (volatility30d < 0.1) return 'LOW';
  if (volatility30d < 0.3) return 'MEDIUM';
  return 'HIGH';
}

async function getPortfolioValuation(positions: TokenPosition[]): Promise<PortfolioValuation | null> {
  try {
    // Filter out stablecoins and get unique tokens
    const tokens = positions
      .filter(pos => !['USDC', 'USDT', 'DAI', 'aEthUSDC', 'SepoliaMNT'].includes(pos.symbol.toUpperCase()))
      .map(pos => pos.symbol.toUpperCase());

    console.log('Fetching prices for tokens:', tokens);

    const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest', {
      headers: {
        'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY,
        'Accept': 'application/json'
      },
      params: {
        symbol: tokens.join(','),
        convert: 'USD'
      }
    });

    if (response.data.status?.error_code) {
      console.error('CoinMarketCap API error:', response.data.status);
      return null;
    }

    // Calculate portfolio values
    const valuedPositions = positions.map(position => {
      const symbol = position.symbol.toUpperCase();
      
      // Skip valuation for stablecoins
      if (['USDC', 'USDT', 'DAI', 'aEthUSDC', 'SepoliaMNT'].includes(symbol)) {
        return {
          ...position,
          valueUSD: position.quantity, // 1:1 for stablecoins
          priceData: { price: 1, percent_change_24h: 0 }
        };
      }

      const tokenData = response.data.data[symbol];
      if (!tokenData) return position;

      return {
        ...position,
        valueUSD: position.quantity * tokenData.quote.USD.price,
        priceData: {
          price: tokenData.quote.USD.price,
          percent_change_24h: tokenData.quote.USD.percent_change_24h,
          market_cap: tokenData.quote.USD.market_cap,
          volume_24h: tokenData.quote.USD.volume_24h
        }
      };
    });

    // Calculate total portfolio value
    const totalValue = valuedPositions.reduce((sum, pos) => sum + (pos.valueUSD || 0), 0);

    console.log('Portfolio Valuation:', {
      positions: valuedPositions,
      totalValueUSD: totalValue
    });

    return {
      positions: valuedPositions,
      totalValueUSD: totalValue
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('CoinMarketCap API error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    } else {
      console.error('CoinMarketCap API error:', error);
    }
    return null;
  }
}

async function analyzeETHPosition(amount: number): Promise<ETHMarketAnalysis> {
  try {
    // Parallel API calls to DeFiLlama
    const [
      priceData,
      protocolTVL,
      yields
    ] = await Promise.all([
      // Get ETH price data
      axios.get('https://coins.llama.fi/prices/current/ethereum:0x0000000000000000000000000000000000000000'),
      // Get ETH protocol TVL
      axios.get('https://api.llama.fi/v2/historicalChainTvl/Ethereum'),
      // Get ETH yield opportunities
      axios.get('https://yields.llama.fi/pools')
    ]);

    // Filter ETH-related yields
    const ethYields = yields.data.data.filter((pool: any) => 
      pool.symbol.toUpperCase().includes('ETH') &&
      pool.tvlUsd > 1000000 // Only pools with >$1M TVL
    );

    // Calculate key metrics
    const currentPrice = priceData.data.coins['ethereum:0x0000000000000000000000000000000000000000'].price;
    const tvlData = protocolTVL.data;
    const currentTVL = tvlData[tvlData.length - 1].tvl;
    const prevTVL = tvlData[tvlData.length - 2].tvl;
    const tvlChange = ((currentTVL - prevTVL) / prevTVL) * 100;

    // Calculate average yields
    const lendingYields = ethYields.filter((p: any) => p.project.toLowerCase().includes('lending'));
    const lpYields = ethYields.filter((p: any) => !p.project.toLowerCase().includes('lending'));
    
    const avgLendingAPY = lendingYields.reduce((sum: number, p: any) => sum + p.apy, 0) / lendingYields.length;
    const avgLPAPY = lpYields.reduce((sum: number, p: any) => sum + p.apy, 0) / lpYields.length;

    // Find best yield opportunity
    const bestYield = ethYields.sort((a: any, b: any) => b.apy - a.apy)[0];

    // Generate recommendation based on metrics
    const recommendation = generateETHRecommendation({
      price: currentPrice,
      tvlChange,
      avgLendingAPY,
      avgLPAPY,
      amount
    });

    return {
      currentPrice,
      priceChange24h: tvlChange, // Using TVL change as a proxy
      priceChange7d: ((currentTVL - tvlData[tvlData.length - 8].tvl) / tvlData[tvlData.length - 8].tvl) * 100,
      marketMetrics: {
        totalValueLocked: currentTVL,
        tvlChange24h: tvlChange,
        dominance: (currentTVL / tvlData[tvlData.length - 1].tvl) * 100,
        yields: {
          avgLendingAPY,
          avgLPAPY,
          bestYieldOpp: {
            protocol: bestYield.project,
            apy: bestYield.apy,
            tvl: bestYield.tvlUsd,
            risk: calculateRisk(bestYield)
          }
        }
      },
      recommendation
    };
  } catch (error) {
    console.error('ETH analysis error:', error);
    throw error;
  }
}

function generateETHRecommendation({
  price,
  tvlChange,
  avgLendingAPY,
  avgLPAPY,
  amount
}: {
  price: number;
  tvlChange: number;
  avgLendingAPY: number;
  avgLPAPY: number;
  amount: number;
}): {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string;
  suggestedEntry?: number;
  suggestedExit?: number;
} {
  let score = 0;
  const reasons: string[] = [];

  // TVL momentum
  if (tvlChange > 5) {
    score += 2;
    reasons.push('Strong TVL growth indicates increasing network usage');
  } else if (tvlChange < -5) {
    score -= 2;
    reasons.push('Declining TVL suggests reduced network activity');
  }

  // Yield opportunities
  if (avgLendingAPY > 5 || avgLPAPY > 10) {
    score += 1;
    reasons.push('Attractive yield opportunities available');
  }

  // Position size analysis
  const positionValue = amount * price;
  if (positionValue > 100000) {
    score -= 1;
    reasons.push('Large position size suggests considering partial profit taking');
  }

  // Generate final recommendation
  let action: 'BUY' | 'SELL' | 'HOLD';
  let confidence: number;

  if (score >= 2) {
    action = 'BUY';
    confidence = 0.8;
  } else if (score <= -2) {
    action = 'SELL';
    confidence = 0.7;
  } else {
    action = 'HOLD';
    confidence = 0.6;
  }

  return {
    action,
    confidence,
    reasoning: reasons.join('. '),
    suggestedEntry: action === 'BUY' ? price * 0.95 : undefined,
    suggestedExit: action === 'SELL' ? price * 1.05 : undefined
  };
}

// Function to analyze news sentiment for tokens
async function analyzeMarketSentiment(tokens: string[]): Promise<MarketSentiment> {
  try {
    // Get token-specific sentiment (existing code)
    const tokenSentiment = await getTokenSentiment(tokens);
    
    // Get general market news and volatility analysis
    const generalMarketNews = await getGeneralMarketNews();

    // Combine token-specific and general market analysis
    return {
      ...tokenSentiment,
      generalMarket: generalMarketNews,
      volatilityWarnings: generalMarketNews.volatilityIndicators
        .filter(v => v.probability > 0.8)
        .map(v => ({
          warning: v.event,
          timeframe: v.timeframe,
          impact: v.potentialImpact
        }))
    };
  } catch (error) {
    console.error('Market sentiment analysis error:', error);
    throw error;
  }
}

// Function to analyze general market news
async function getGeneralMarketNews(): Promise<GeneralMarketNews> {
  try {
    const apiKey = process.env.CRYPTONEWS_API_KEY;
    if (!apiKey) {
      throw new Error('CryptoNews API key not configured');
    }

    // Get general crypto news with different filters
    const [generalNews, technicalNews, regulatoryNews] = await Promise.all([
      // General market news
      axios.get('https://cryptonews-api.com/api/v1', {
        params: {
          token: apiKey,
          items: 50,
          type: 'general'
        }
      }),
      // Technical analysis news
      axios.get('https://cryptonews-api.com/api/v1', {
        params: {
          token: apiKey,
          items: 20,
          topics: 'technical analysis'
        }
      }),
      // Regulatory news
      axios.get('https://cryptonews-api.com/api/v1', {
        params: {
          token: apiKey,
          items: 20,
          keywords: 'regulation,SEC,CFTC,law'
        }
      })
    ]);

    // Analyze news for major events
    const majorEvents = await analyzeMajorEvents([
      ...generalNews.data.data,
      ...regulatoryNews.data.data
    ]);

    // Analyze technical indicators for volatility
    const volatilityIndicators = analyzeVolatilityIndicators(
      technicalNews.data.data
    );

    // Determine market mood based on all news
    const marketMoods = calculateMarketMoods([
      ...generalNews.data.data,
      ...technicalNews.data.data,
      ...regulatoryNews.data.data
    ]);

    return {
      majorEvents,
      volatilityIndicators,
      marketMoods
    };
  } catch (error) {
    console.error('General market news analysis error:', error);
    throw error;
  }
}

// Helper function to analyze major events using GPT
async function analyzeMajorEvents(newsItems: any[]): Promise<GeneralMarketNews['majorEvents']> {
  const model = new ChatOpenAI({
    temperature: 0.3,
    modelName: "gpt-3.5-turbo",
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const response = await model.invoke(
    `Analyze these news items and identify major market-moving events:
     ${JSON.stringify(newsItems)}
     
     For each major event, provide:
     1. Brief summary
     2. Impact level (HIGH/MEDIUM/LOW)
     3. Affected market sectors
     4. Potential market implications
     
     Return as JSON array matching the majorEvents interface.`
  );

  return JSON.parse(response.content);
}

// Helper function to analyze technical indicators for volatility
function analyzeVolatilityIndicators(technicalNews: any[]): GeneralMarketNews['volatilityIndicators'] {
  return technicalNews
    .filter(news => {
      const title = news.title.toLowerCase();
      return (
        title.includes('volatility') ||
        title.includes('breakout') ||
        title.includes('support') ||
        title.includes('resistance') ||
        title.includes('pattern')
      );
    })
    .map(news => ({
      event: news.title,
      probability: calculateProbability(news),
      timeframe: extractTimeframe(news.title),
      potentialImpact: calculateImpact(news)
    }))
    .filter(indicator => indicator.probability > 0.6); // Only high probability events
}

// Helper function to calculate market moods
function calculateMarketMoods(allNews: any[]): GeneralMarketNews['marketMoods'] {
  const calculateMood = (news: any[], sector?: string) => {
    const relevantNews = sector 
      ? news.filter(n => n.title.toLowerCase().includes(sector.toLowerCase()))
      : news;

    const sentiment = relevantNews.reduce((sum, n) => {
      if (n.sentiment > 0.3) return sum + 1;
      if (n.sentiment < -0.3) return sum - 1;
      return sum;
    }, 0);

    if (sentiment > 0) return 'BULLISH';
    if (sentiment < 0) return 'BEARISH';
    return 'NEUTRAL';
  };

  return {
    overall: calculateMood(allNews),
    defi: calculateMood(allNews, 'defi'),
    nft: calculateMood(allNews, 'nft'),
    layer1: calculateMood(allNews, 'layer1')
  };
}

// Helper function to batch tokens for CryptoNews API
function batchTokensForNews(tokens: string[]): string[][] {
  // Sort tokens by value/importance first (you can modify this logic)
  const sortedTokens = [...tokens].sort((a, b) => {
    // Prioritize major tokens
    const priority = {
      'ETH': 3,
      'BTC': 3,
      'BNB': 2,
      'LINK': 2,
      // Add more as needed
    };
    return (priority[b] || 1) - (priority[a] || 1);
  });

  // Split into batches of 3
  const batches: string[][] = [];
  for (let i = 0; i < sortedTokens.length; i += 3) {
    batches.push(sortedTokens.slice(i, i + 3));
  }
  return batches;
}

// Modify the token prioritization logic
function getTopTokens(tokens: string[]): string[] {
  // Priority mapping for tokens
  const priority: Record<string, number> = {
    'ETH': 5,
    'BTC': 4,
    'LINK': 3,
    'USDC': 3,  // Add USDC with high priority
    'BNB': 2,
    'MATIC': 2,
    'AAVE': 2
  };

  // Sort tokens by priority and take top 6 (for 2 batches of 3)
  return tokens
    .sort((a, b) => (priority[b] || 0) - (priority[a] || 0))
    .slice(0, 6);
}

// Modified function to get news for a single token
async function getTokenNews(token: string, apiKey: string, pages: number = 1): Promise<NewsItem[]> {
  // Use mock data in development
  if (process.env.NODE_ENV === 'development') {
    const mockResponse = getMockNews(token);
    return mockResponse.data;
  }

  // Real API call only happens in production
  const allNews: NewsItem[] = [];
  
  for (let page = 1; page <= pages; page++) {
    try {
      const response = await axios.get<NewsResponse>('https://cryptonews-api.com/api/v1', {
        params: {
          token: apiKey,
          items: 3,
          tickers: token,
          page: page
        }
      });

      if (response.data.data && response.data.data.length > 0) {
        allNews.push(...response.data.data);
      }

      if (page < pages) {
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    } catch (error) {
      console.error(`Error fetching news for token ${token}, page ${page}:`, error);
      break;
    }
  }

  return allNews;
}

// Function to get news for multiple tokens
async function getAllTokenNews(tokens: string[], apiKey: string): Promise<Record<string, NewsItem[]>> {
  const newsMap: Record<string, NewsItem[]> = {};
  
  // Get news for each token separately
  for (const token of tokens) {
    try {
      // Get 3 news items for this token
      const tokenNews = await getTokenNews(token, apiKey);
      newsMap[token] = tokenNews;
      
      // Add delay between token requests
      if (token !== tokens[tokens.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Failed to get news for ${token}:`, error);
      newsMap[token] = [];
    }
  }

  return newsMap;
}

// Helper function to calculate sentiment score from news items
function calculateSentimentScore(news: NewsItem[]): number {
  const sentimentMap = {
    'Positive': 2.0,  // Increased weight for positive sentiment
    'Negative': -1.0,
    'Neutral': 0
  };

  const total = news.reduce((score, item) => {
    // Give more weight to recent news
    const isRecent = new Date(item.date) > new Date(Date.now() - 24 * 60 * 60 * 1000);
    const weight = isRecent ? 1.5 : 1;
    return score + (sentimentMap[item.sentiment] * weight);
  }, 0);

  // Normalize but bias towards BUY
  const score = total / news.length;
  return score > 0.3 ? 'BUY' :  // Lower threshold for BUY
         score < -0.5 ? 'SELL' : // Keep same threshold for SELL
         'HOLD';
}

// Helper function to extract major events
function extractMajorEvents(news: NewsItem[]): MarketNewsAnalysis['generalMarket']['majorEvents'] {
  return news
    .filter(item => item.sentiment !== 'Neutral')
    .map(item => ({
      title: item.title,
      summary: item.text,
      impact: item.sentiment === 'Positive' ? 'HIGH' : 'MEDIUM',
      timestamp: item.date,
      relevantTokens: extractTokensFromText(item.text)
    }));
}

// Helper function to extract token symbols from text
function extractTokensFromText(text: string): string[] {
  const commonTokens = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'LINK'];
  return commonTokens.filter(token => 
    text.toUpperCase().includes(token)
  );
}

// Update the market news analysis function
async function analyzeMarketNews(portfolio: PortfolioScan): Promise<MarketNewsAnalysis> {
  const apiKey = process.env.CRYPTONEWS_API_KEY;
  if (!apiKey) {
    throw new Error('CryptoNews API key not configured');
  }

  try {
    // 1. Get general market sentiment
    const generalNews = await getTokenNews('', apiKey);
    console.log('General News:', generalNews);

    // 2. Get news for each token
    // For news, we want non-stablecoins + USDC (special case)
    const tokensForNews = portfolio.tokens
      .filter(t => !t.isStablecoin || t.symbol === 'USDC')
      .map(t => t.symbol);
    
    const topTokens = getTopTokens(tokensForNews).slice(0, 3);
    const tokenNewsMap = await getAllTokenNews(topTokens, apiKey);
    console.log('Token News Map:', tokenNewsMap);

    // Process token-specific news
    const portfolioTokens: MarketNewsAnalysis['portfolioTokens'] = {};
    
    // Special handling for USDC in news section
    tokensForNews.forEach(symbol => {
      const tokenNews = tokenNewsMap[symbol] || [];
      console.log(`Processing ${symbol} news:`, tokenNews);
      
      if (tokenNews.length > 0) {
        // Calculate overall sentiment from all news items
        const sentimentScore = calculateSentimentScore(tokenNews);
        
        // Special handling for USDC
        if (symbol === 'USDC') {
          portfolioTokens[symbol] = {
            news: [{
              title: tokenNews[0].title,
              sentiment: tokenNews[0].sentiment.toLowerCase(),
              relevance: 1,
              source: tokenNews[0].source_name,
              url: tokenNews[0].news_url,
              timestamp: tokenNews[0].date
            }],
            analysis: {
              sentiment: sentimentScore,
              riskFactors: ['Stablecoin stability'],
              opportunities: [],
              recommendation: 'HOLD'  // USDC always shows HOLD
            }
          };
        } else {
          // Regular tokens get BUY/SELL/HOLD recommendations
          let recommendation: 'BUY' | 'SELL' | 'HOLD';
          if (sentimentScore > 0.3) {
            recommendation = 'BUY';
          } else if (sentimentScore < -0.5) {
            recommendation = 'SELL';
          } else {
            recommendation = 'HOLD';
          }

          portfolioTokens[symbol] = {
            news: [{
              title: tokenNews[0].title,
              sentiment: tokenNews[0].sentiment.toLowerCase(),
              relevance: 1,
              source: tokenNews[0].source_name,
              url: tokenNews[0].news_url,
              timestamp: tokenNews[0].date
            }],
            analysis: {
              sentiment: sentimentScore,
              riskFactors: ['Market volatility'],
              opportunities: [],
              recommendation
            }
          };
        }
      }
    });

    return {
      generalMarket: {
        sentiment: calculateMarketSentiment(generalNews),
        score: calculateSentimentScore(generalNews),
        majorEvents: extractMajorEvents(generalNews),
        keyMetrics: analyzeMarketMetrics(generalNews)
      },
      portfolioTokens,
      summary: {
        opportunities: [],
        actionItems: ['Monitor market conditions'],
        riskLevel: 'MEDIUM'
      }
    };
  } catch (error) {
    console.error('Market news analysis error:', error);
    throw error;
  }
}

// Helper functions for news analysis
function calculateMarketSentiment(news: NewsItem[]): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  const sentimentScore = news.reduce((score, item) => {
    if (item.sentiment > 0) return score + 1;
    if (item.sentiment < 0) return score - 1;
    return score;
  }, 0);

  if (sentimentScore > 3) return 'BULLISH';
  if (sentimentScore < -3) return 'BEARISH';
  return 'NEUTRAL';
}

function analyzeMarketMetrics(news: NewsItem[]): MarketNewsAnalysis['generalMarket']['keyMetrics'] {
  // Analyze market metrics from news
  // Implementation here
}

function processTokenNews(news: NewsItem[]): MarketNewsAnalysis['portfolioTokens'][string]['news'] {
  // Process and format token-specific news
  // Implementation here
}

function analyzeTokenNews(news: NewsItem[], symbol: string): MarketNewsAnalysis['portfolioTokens'][string]['analysis'] {
  // Analyze token-specific news and generate recommendations
  // Implementation here
}

function generateMarketSummary(
  generalMarket: any,
  portfolioTokens: any,
  portfolio: PortfolioScan
): MarketNewsAnalysis['summary'] {
  // Generate comprehensive market summary
  // Implementation here
}

// Add this function to process Zerion data
async function processZerionData(zerionData: any): Promise<PortfolioScan> {
  try {
    // Extract positions from Zerion data
    const positions = zerionData.data
      .filter((position: any) => 
        !position.attributes.flags.is_trash || 
        position.attributes.fungible_info.symbol === 'LINK'
      )
      .map((position: any) => ({
        symbol: position.attributes.fungible_info.symbol,
        quantity: position.attributes.quantity.numeric,
        valueUSD: position.attributes.value,
        isStablecoin: isStablecoin(position.attributes.fungible_info.symbol)
      }));

    // Get prices for non-stablecoin tokens
    const nonStableTokens = positions
      .filter(p => !p.isStablecoin)
      .map(p => p.symbol);

    if (nonStableTokens.length > 0) {
      const priceData = await getCMCPrices(nonStableTokens);
      
      // Update positions with price data
      positions.forEach(position => {
        if (!position.isStablecoin && priceData[position.symbol]) {
          position.priceData = {
            price: priceData[position.symbol].quote.USD.price,
            change24h: priceData[position.symbol].quote.USD.percent_change_24h,
            marketCap: priceData[position.symbol].quote.USD.market_cap,
            volume24h: priceData[position.symbol].quote.USD.volume_24h
          };
        }
      });
    }

    // Calculate total portfolio value
    const totalValue = positions.reduce((sum, pos) => sum + pos.valueUSD, 0);

    return {
      tokens: positions,
      totalValue,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error processing Zerion data:', error);
    throw error;
  }
}

// Helper function to get prices from CoinMarketCap
async function getCMCPrices(symbols: string[]) {
  try {
    const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest', {
      headers: {
        'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY,
        'Accept': 'application/json'
      },
      params: {
        symbol: symbols.map(s => s.toUpperCase()).join(','),
        convert: 'USD'
      }
    });

    if (response.data.status?.error_code) {
      throw new Error(`CoinMarketCap API error: ${response.data.status.error_message}`);
    }

    return response.data.data;
  } catch (error) {
    console.error('Error fetching CMC prices:', error);
    throw error;
  }
}

// Use private INFURA_API_KEY for server-side operations
const provider = new ethers.JsonRpcProvider(
  `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`
);

// Update the main handler to use the new flow
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { portfolioData } = req.body;

    // 1. Process portfolio data from Zerion
    const portfolio: PortfolioScan = await processZerionData(portfolioData);

    // 2. Analyze market news
    const marketAnalysis = await analyzeMarketNews(portfolio);

    // Return the market analysis (this will be input for the next bot)
    return res.status(200).json({
      portfolio,
      marketAnalysis,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ 
      error: 'Failed to analyze portfolio',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 