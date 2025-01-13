import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address } = req.body;
    if (!address) {
      throw new Error('Address is required');
    }

    // Call Zerion API
    const response = await fetch(`https://api.zerion.io/v1/wallets/${address}/positions/`, {
      headers: {
        'accept': 'application/json',
        'authorization': `Basic ${Buffer.from(process.env.ZERION_API_KEY + ':').toString('base64')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch portfolio data');
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Portfolio analysis error:', error);
    return res.status(500).json({ 
      error: 'Failed to analyze portfolio',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 