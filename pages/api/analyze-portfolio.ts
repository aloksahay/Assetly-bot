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

    // Initialize Brian Agent server-side
    const agent = await createBrianAgent({
      apiKey: process.env.BRIAN_API_KEY!,
      privateKeyOrAccount: process.env.AGENT_PRIVATE_KEY! as `0x${string}`,
      llm: new ChatOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      metadata: {
        supportedProtocols: ["uniswap", "aave", "curve", "compound", "balancer"],
        supportedChains: ["ethereum", "arbitrum", "optimism", "polygon", "base"]
      }
    });

    // Get DeFi strategy recommendations
    const defiStrategy = await agent.invoke({
      input: `As a DeFi portfolio manager, analyze this wallet and suggest optimal defi yield strategies:
        Wallet: ${address} on ${chain}
        Native Balance: ${walletInfo.nativeBalance}
        Tokens: ${JSON.stringify(walletInfo.tokens)}
        
        Provide:
        1. Portfolio Overview
        - Total value in USD
        - Current asset allocation
        - Risk exposure levels
        
        2. Compound Opportunities
        - Best lending positions on Compound
        - Current Compound APY rates
        - Supply and borrow opportunities
        - Compound rewards if available
        
        3. Risk Management
        - Recommended collateral ratio
        - Liquidation risks
        - Protocol exposure limits`,
      metadata: { address, chain }
    });

    // Get specific transaction recommendations
    const transactions = await agent.invoke({
      input: `Generate specific Compound transaction recommendations to optimize this portfolio:
        Current Holdings: ${JSON.stringify(walletInfo)}
        
        Suggest:
        1. Supply positions on Compound
        2. Borrow positions on Compound
        3. Optimal collateral ratios
        4. Risk hedging moves
        
        For each transaction include:
        - Expected APY/returns
        - Risk level (including liquidation risks)
        - Specific market details
        - Step by step instructions`,
      metadata: { address, chain }
    });

    // Format response
    return res.status(200).json({
      currentPortfolio: {
        walletInfo,
        timestamp: new Date().toISOString()
      },
      analysis: {
        defiStrategy,
        transactions,
        chain,
        address
      }
    });

  } catch (error) {
    console.error('Analysis Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 