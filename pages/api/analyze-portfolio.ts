import { NextApiRequest, NextApiResponse } from "next";
import { createBrianAgent } from "@brian-ai/langchain";
import { ChatOpenAI } from "@langchain/openai";
import { InfuraService } from "../../utils/infura";

// Initialize services
const infura = new InfuraService(process.env.INFURA_API_KEY!);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address, chain } = req.body;

    // Initialize Brian Agent
    const agent = await createBrianAgent({
      apiKey: process.env.BRIAN_API_KEY!,
      privateKeyOrAccount: process.env.AGENT_PRIVATE_KEY! as `0x${string}`,
      llm: new ChatOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      metadata: {
        supportedProtocols: ["uniswap", "aave", "curve"],
        supportedChains: ["ethereum", "arbitrum", "optimism", "polygon", "base"]
      }
    });

    // Get wallet info from Infura
    const walletInfo = await infura.getWalletInfo(address, chain);

    // Get analysis from Brian
    const analysis = await agent.invoke({
      input: `Analyze this wallet's DeFi positions and opportunities:
        Address: ${address}
        Chain: ${chain}
        Native Balance: ${walletInfo.nativeBalance}
        Token Balances: ${JSON.stringify(walletInfo.tokens)}
        
        Please provide:
        1. Total portfolio value in USD
        2. Best yield opportunities
        3. Risk assessment
        4. Optimization suggestions`,
      metadata: { address, chain }
    });

    return res.status(200).json({
      walletInfo,
      analysis
    });
  } catch (error) {
    console.error('Analysis Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 