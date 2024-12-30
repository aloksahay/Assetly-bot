import { NextApiRequest, NextApiResponse } from "next";
import { createBrianAgent } from "@brian-ai/langchain";
import { ChatOpenAI } from "@langchain/openai";
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

// Move agent creation inside the handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create agent inside the handler
    const agent = await createBrianAgent({
      apiKey: process.env.BRIAN_API_KEY!,
      privateKeyOrAccount: process.env.AGENT_PRIVATE_KEY! as `0x${string}`,
      llm: new ChatOpenAI({ apiKey: process.env.OPENAI_API_KEY })
    });

    const { prompt } = req.body;
    const response = await agent.invoke({ input: prompt });
    return res.status(200).json(response);
  } catch (error) {
    console.error('Brian Agent Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}