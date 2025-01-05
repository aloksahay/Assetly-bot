import { NextApiRequest, NextApiResponse } from 'next';
import { BrianSDK } from '@brian-ai/sdk';

// Initialize Brian SDK outside handler to reuse instance
const brian = new BrianSDK({
  apiKey: process.env.BRIAN_API_KEY ?? '' // Handle potential undefined
});

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

    if (!process.env.BRIAN_API_KEY) {
      throw new Error('BRIAN_API_KEY is not configured');
    }

    const brianData = await brian.ask({
      prompt: `What are the token balances and DeFi positions for ${address} on ${chain}?`,
      kb: "public-knowledge-box"
    });

    return res.status(200).json({
      success: true,
      data: brianData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Brian Analysis Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 