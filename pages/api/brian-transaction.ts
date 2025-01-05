import { NextApiRequest, NextApiResponse } from 'next';
import { BrianSDK } from '@brian-ai/sdk';

const brian = new BrianSDK({
  apiKey: process.env.BRIAN_API_KEY!
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, address } = req.body;
    const response = await brian.transact({ prompt, address });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Transaction failed' });
  }
} 