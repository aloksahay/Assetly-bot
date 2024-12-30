import { NextApiRequest, NextApiResponse } from "next";
import { createBrianAgent } from "@brian-ai/langchain";
import { ChatOpenAI } from "@langchain/openai";
import { createPublicClient, http, formatEther } from 'viem';
import { 
  mainnet, arbitrum, optimism, polygon, base, 
  zkSync, gnosis, scroll, bsc, avalanche, linea 
} from 'viem/chains';

// Create public clients for each supported network
const clients = {
  ethereum: createPublicClient({
    chain: mainnet,
    transport: http(`https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`)
  }),
  arbitrum: createPublicClient({
    chain: arbitrum,
    transport: http(`https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`)
  }),
  optimism: createPublicClient({
    chain: optimism,
    transport: http(`https://optimism-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`)
  }),
  polygon: createPublicClient({
    chain: polygon,
    transport: http(`https://polygon-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`)
  }),
  base: createPublicClient({
    chain: base,
    transport: http(`https://base-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`)
  }),
  // Add other networks as needed
};

// Initialize Brian Agent
const agent = await createBrianAgent({
  apiKey: process.env.BRIAN_API_KEY!,
  privateKeyOrAccount: process.env.AGENT_PRIVATE_KEY! as `0x${string}`,
  llm: new ChatOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  metadata: {
    supportedProtocols: ["uniswap", "aave", "curve"],
    supportedChains: [
      "ethereum", "arbitrum", "optimism", "polygon", 
      "base", "zksync", "scroll", "gnosis", "linea",
      "bnb", "avalanche", "mode", "blast"
    ]
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
    
    // Extract wallet address and chain from prompt
    const addressMatch = prompt.match(/0x[a-fA-F0-9]{40}/);
    const address = addressMatch ? addressMatch[0] as `0x${string}` : null;
    
    // Try to detect which chain is being referenced
    const chainMatch = prompt.toLowerCase().match(/on\s+(ethereum|arbitrum|optimism|polygon|base|zksync|scroll|gnosis|linea|bnb|avalanche|mode|blast)/);
    const chain = chainMatch ? chainMatch[1] : 'ethereum'; // default to ethereum

    let contextData = '';
    
    // If address found, fetch on-chain data from the appropriate chain
    if (address && clients[chain]) {
      const balance = await clients[chain].getBalance({ address });
      contextData = `
        Wallet ${address} on ${chain}:
        Native Token Balance: ${formatEther(balance)} ${chain === 'ethereum' ? 'ETH' : chain.toUpperCase()}
      `;
    }

    const enhancedPrompt = contextData 
      ? `${contextData}\n\n${prompt}`
      : prompt;

    const response = await agent.invoke({ 
      input: enhancedPrompt,
      metadata: address ? { address, chain } : undefined
    });
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Brian Agent Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}