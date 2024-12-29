import { NextApiRequest, NextApiResponse } from "next";
import { createBrianAgent } from "@brian-ai/langchain";
import { ChatOpenAI } from "@langchain/openai";
import { createPublicClient, http, formatEther } from 'viem';
import { mainnet } from 'viem/chains';

// Create a public client for fetching on-chain data
const client = createPublicClient({
  chain: mainnet,
  transport: http()
});

// Initialize Brian Agent
const agent = await createBrianAgent({
  apiKey: process.env.BRIAN_API_KEY!,
  privateKeyOrAccount: process.env.AGENT_PRIVATE_KEY! as `0x${string}`,
  llm: new ChatOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  metadata: {
    supportedProtocols: ["uniswap", "aave", "curve"],
    supportedChains: ["ethereum", "avalanche", "base"]
  }
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt } = req.body;
    
    // Extract wallet address from prompt if it exists
    const addressMatch = prompt.match(/0x[a-fA-F0-9]{40}/);
    const address = addressMatch ? addressMatch[0] as `0x${string}` : null;

    let contextData = '';
    
    // If address found, fetch on-chain data
    if (address) {
      const balance = await client.getBalance({ address });
      contextData = `
        Wallet ${address}:
        ETH Balance: ${formatEther(balance)} ETH
      `;
    }

    // Add context data to prompt if available
    const enhancedPrompt = contextData 
      ? `${contextData}\n\n${prompt}`
      : prompt;

    const response = await agent.invoke({ 
      input: enhancedPrompt,
      metadata: address ? { address } : undefined
    });
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Brian Agent Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}