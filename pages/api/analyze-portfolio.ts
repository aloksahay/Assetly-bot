import { NextApiRequest, NextApiResponse } from "next";
import { createBrianAgent } from "@brian-ai/langchain";
import { ChatOpenAI } from "@langchain/openai";
import { ZerionService } from "../../utils/zerion";

// Initialize services
const zerion = new ZerionService(process.env.ZERION_API_KEY!);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address, chain = 'ethereum' } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    // Get wallet portfolio from Zerion
    const walletInfo = await zerion.getWalletPortfolio(address, chain);

    // Initialize Brian Agent
    const agent = await createBrianAgent({
      apiKey: process.env.BRIAN_API_KEY!,
      privateKeyOrAccount: process.env.AGENT_PRIVATE_KEY! as `0x${string}`,
      llm: new ChatOpenAI({ apiKey: process.env.OPENAI_API_KEY })
    });

    // Format portfolio data for analysis
    const portfolioSummary = `
      Portfolio Value (Testnet): $${walletInfo.totalValueUSD.toFixed(2)}
      Native Balance: ${walletInfo.nativeBalance.amount} (${chain} testnet) ($${walletInfo.nativeBalance.valueUSD.toFixed(2)})
      Tokens: ${walletInfo.tokens.map(t => 
        `\n- ${t.symbol}: ${t.balance} ($${t.valueUSD.toFixed(2)})`
      ).join('')}
    `;

    // Get DeFi strategy recommendations
    const defiStrategy = await agent.invoke({
      input: `Analyze this portfolio and suggest optimal DeFi strategies:
        ${portfolioSummary}
        
        Provide:
        1. Portfolio Analysis
        - Asset allocation overview
        - Risk assessment
        - Major opportunities
        
        2. DeFi Opportunities
        - Best yield farming positions
        - Lending opportunities
        - Liquidity provision options
        
        3. Risk Management
        - Diversification suggestions
        - Risk mitigation strategies
        - Protocol exposure recommendations`,
      metadata: { address, chain }
    });

    return res.status(200).json({
      currentPortfolio: {
        walletInfo,
        timestamp: new Date().toISOString()
      },
      analysis: {
        defiStrategy,
        chain,
        address
      }
    });

  } catch (error) {
    console.error('Analysis Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 