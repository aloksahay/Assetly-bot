import { NextApiRequest, NextApiResponse } from 'next';
import { ChatOpenAI } from "@langchain/openai";
import axios, { AxiosResponse } from 'axios';

// Helper function to get token prices from CoinMarketCap
async function getTokenPrices(symbols: string[]) {
  try {
    // Basic plan endpoint for latest quotes
    const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest', {
      headers: {
        'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY,
        'Accept': 'application/json'
      },
      params: {
        // Convert array to comma-separated string and uppercase the symbols
        symbol: symbols.map(s => s.toUpperCase()).join(','),
        convert: 'USD'
        // Removed aux parameter as it's not needed for basic price data
      }
    });

    // For free plan, we only need basic price data
    const marketData: Record<string, any> = {};
    
    // Add error handling for the response
    if (response.data.status?.error_code) {
      console.error('CoinMarketCap API error:', response.data.status);
      return null;
    }

    for (const symbol in response.data.data) {
      marketData[symbol] = {
        price: response.data.data[symbol].quote.USD.price,
        percent_change_24h: response.data.data[symbol].quote.USD.percent_change_24h,
        market_cap: response.data.data[symbol].quote.USD.market_cap,
        volume_24h: response.data.data[symbol].quote.USD.volume_24h
      };
    }

    console.log('Market Data:', marketData); // Debug log
    return marketData;
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { portfolioData } = req.body;

  if (!portfolioData) {
    return res.status(400).json({ message: 'Portfolio data is required' });
  }

  try {
    // Extract non-stablecoin tokens from portfolio
    const tokens = portfolioData.data
      .filter((position: any) => {
        const symbol = position.attributes.fungible_info.symbol;
        // Exclude stablecoins and test tokens
        return !['USDC', 'aEthUSDC', 'SepoliaMNT'].includes(symbol.toUpperCase());
      })
      .map((position: any) => position.attributes.fungible_info.symbol);

    console.log('Tokens to fetch:', tokens); // Debug log

    // Get market data from CoinMarketCap
    const marketData = await getTokenPrices(tokens);

    const model = new ChatOpenAI({
      temperature: 0.3,
      modelName: "gpt-4",
      openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    });

    // Stage 1: Initial Portfolio Assessment
    const portfolioAssessment = await model.invoke(
      `Analyze this portfolio's current state:
       Portfolio Data: ${JSON.stringify(portfolioData)}
       Market Data: ${JSON.stringify(marketData)}
       
       Provide:
       1. Current asset distribution analysis
       2. Market conditions for major holdings (use the CoinMarketCap data to discuss price trends)
       3. Overall portfolio value and risk exposure
       
       Format as concise bullet points.`
    );

    // Stage 2: Opportunity Assessment
    const opportunityAssessment = await model.invoke(
      `Based on this portfolio and market data:
       Portfolio: ${JSON.stringify(portfolioData)}
       Market Data: ${JSON.stringify(marketData)}
       
       Identify:
       1. Top DeFi yield opportunities (with APY)
       2. Potential trading opportunities based on current market conditions
       3. Promising liquidity positions
       Be specific and include expected returns.`
    );

    // Stage 3: Strategy Formation
    const strategyFormation = await model.invoke(
      `Using the portfolio data and current market conditions, provide:
       1. Portfolio Rebalancing: Suggest optimal asset redistribution
       2. Yield Optimization: Recommend specific protocols and strategies
       3. Risk Mitigation: Suggest diversification moves
       
       Portfolio Data: ${JSON.stringify(portfolioData)}
       Market Data: ${JSON.stringify(marketData)}
       Current Assessment: ${portfolioAssessment.content}
       Opportunities: ${opportunityAssessment.content}
       
       Format as actionable recommendations.`
    );

    return res.status(200).json({
      assessment: portfolioAssessment.content,
      opportunities: opportunityAssessment.content,
      strategy: strategyFormation.content,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('AI analysis error:', error);
    return res.status(500).json({ message: 'Failed to analyze portfolio' });
  }
} 