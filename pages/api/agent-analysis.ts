import { NextApiRequest, NextApiResponse } from 'next';
import { ChatOpenAI } from "@langchain/openai";
import axios from 'axios';

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

// Function to fetch DeFi protocol data from DeFiLlama
async function getDeFiMarketData(tokens: string[]): Promise<MarketData> {
  try {
    // Parallel API calls for better performance
    const [yieldsResponse, protocolsResponse, pricesResponse] = await Promise.all([
      axios.get('https://yields.llama.fi/pools'),
      axios.get('https://api.llama.fi/protocols'),
      axios.get(`https://coins.llama.fi/prices/current/${tokens.map(t => `ethereum:${t}`).join(',')}`)
    ]);

    // Type the responses
    const pools: YieldPool[] = yieldsResponse.data.data;
    const protocols: Protocol[] = protocolsResponse.data;
    const prices: Record<string, TokenPrice> = pricesResponse.data.coins;

    // Filter relevant pools
    const relevantPools = pools.filter(pool => 
      tokens.some(token => pool.symbol.toUpperCase().includes(token.toUpperCase())) &&
      pool.tvlUsd > 100000 // Only pools with >$100k TVL
    );

    // Map to our protocol data structure
    const protocolData = relevantPools.map(pool => ({
      tvl: pool.tvlUsd,
      apy: pool.apy,
      symbol: pool.symbol,
      pool: pool.pool,
      project: pool.project,
      chain: pool.chain,
      apyPct30d: pool.apyPct30d,
      volumeUsd24h: pool.volumeUsd24h,
      stablecoin: pool.symbol.includes('USD') || pool.symbol.includes('DAI'),
      ilRisk: calculateILRisk(pool.il7d),
      exposure: [pool.chain],
      baseApy: pool.apyBase || 0,
      rewardApy: pool.apyReward || 0,
      tvlChange24h: pool.tvlUsdChange24h,
      rewardTokens: pool.rewardTokens || []
    }));

    // Get protocol details for each pool
    const protocolDetails = protocolData.map(pool => {
      const protocol = protocols.find(p => 
        p.name.toLowerCase() === pool.project.toLowerCase()
      );
      return {
        ...pool,
        protocolTvl: protocol?.tvl || 0,
        protocolChange24h: protocol?.change_1d || 0,
        protocolChange7d: protocol?.change_7d || 0
      };
    });

    // Calculate aggregate stats
    const aggregateStats = {
      totalTvl: protocolDetails.reduce((sum, p) => sum + p.tvl, 0),
      avgApy: protocolDetails.reduce((sum, p) => sum + p.apy, 0) / protocolDetails.length,
      volumeUsd24h: protocolDetails.reduce((sum, p) => sum + (p.volumeUsd24h || 0), 0),
      avgBaseApy: protocolDetails.reduce((sum, p) => sum + p.baseApy, 0) / protocolDetails.length,
      avgRewardApy: protocolDetails.reduce((sum, p) => sum + p.rewardApy, 0) / protocolDetails.length,
      totalProtocols: new Set(protocolDetails.map(p => p.project)).size
    };

    return {
      protocols: protocolDetails,
      aggregateStats,
      prices
    };
  } catch (error) {
    console.error('DeFiLlama API error:', error);
    throw error;
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
    modelName: "gpt-4",
    openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
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

async function analyzePortfolio(
  model: ChatOpenAI,
  portfolioData: any,
  valuation: PortfolioValuation
): Promise<{
  assessment: PortfolioAssessment;
  opportunities: OpportunityAssessment;
  strategy: StrategyRecommendation;
  ethAnalysis?: ETHMarketAnalysis;
  marketSentiment?: MarketSentiment;
}> {
  // Get ETH position if exists
  const ethPosition = valuation.positions.find(p => p.symbol.toUpperCase() === 'ETH');
  
  // If we have ETH, analyze it
  const ethAnalysis = ethPosition ? await analyzeETHPosition(ethPosition.quantity) : undefined;

  // Get DeFi market data for the tokens in portfolio
  const tokens = valuation.positions
    .filter(pos => !['USDC', 'USDT', 'DAI'].includes(pos.symbol.toUpperCase()))
    .map(pos => pos.symbol);
  
  const defiMarketData = await getDeFiMarketData(tokens);

  // Get market sentiment for portfolio tokens
  const marketSentiment = await analyzeMarketSentiment(tokens);

  // Stage 1: Initial Portfolio Assessment with DeFi context
  const assessmentResponse = await model.invoke(
    `Analyze this portfolio and return a JSON response:
     Portfolio: ${JSON.stringify(portfolioData)}
     Valuation: ${JSON.stringify(valuation)}
     DeFi Market Data: ${JSON.stringify(defiMarketData)}
     
     Return a JSON object with:
     1. assetDistribution: Percentage and USD value of each asset
     2. marketConditions: Price trends and DeFi metrics for each token
     3. riskMetrics: Overall risk assessment including DeFi exposure
     
     Format as valid JSON matching the PortfolioAssessment interface.`
  );

  // Stage 2: Opportunity Assessment
  const opportunitiesResponse = await model.invoke(
    `Identify opportunities and return a JSON response:
     Portfolio: ${JSON.stringify(portfolioData)}
     Valuation: ${JSON.stringify(valuation)}
     Assessment: ${assessmentResponse.content}
     
     Return a JSON object with:
     1. yieldOpportunities: Best yield options with APY and risk
     2. tradingOpportunities: Potential trades with expected returns
     3. liquidityPositions: LP opportunities with APR and IL risk
     
     Format as valid JSON matching the OpportunityAssessment interface.`
  );

  // Stage 3: Strategy Formation
  const strategyResponse = await model.invoke(
    `Form strategy recommendations as JSON:
     Portfolio: ${JSON.stringify(portfolioData)}
     Valuation: ${JSON.stringify(valuation)}
     Assessment: ${assessmentResponse.content}
     Opportunities: ${opportunitiesResponse.content}
     
     Return a JSON object with:
     1. rebalancing: Specific allocation changes needed
     2. yieldStrategy: Step-by-step yield optimization plans
     3. riskMitigation: Prioritized risk management actions
     
     Format as valid JSON matching the StrategyRecommendation interface.`
  );

  return {
    assessment: JSON.parse(assessmentResponse.content),
    opportunities: JSON.parse(opportunitiesResponse.content),
    strategy: JSON.parse(strategyResponse.content),
    ethAnalysis,
    marketSentiment
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { portfolioData } = req.body;

  try {
    const positions: TokenPosition[] = portfolioData.data.map((position: any) => ({
      symbol: position.attributes.fungible_info.symbol,
      quantity: position.attributes.quantity.numeric
    }));

    const valuation = await getPortfolioValuation(positions);
    if (!valuation) {
      throw new Error('Failed to get portfolio valuation');
    }

    const model = new ChatOpenAI({
      temperature: 0.3,
      modelName: "gpt-4",
      openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    });

    const analysis = await analyzePortfolio(model, portfolioData, valuation);

    return res.status(200).json({
      valuation,
      ...analysis,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ 
      message: 'Failed to analyze portfolio',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 