import { NextApiRequest, NextApiResponse } from 'next';
import { ZerionService } from '@/utils/zerion';

const zerion = new ZerionService();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    // Validate API key
    if (!process.env.ZERION_API_KEY) {
      return res.status(500).json({ 
        error: 'Zerion API key not configured',
        timestamp: new Date().toISOString()
      });
    }

    console.log('Starting portfolio analysis for:', address);
    const positions = await zerion.getWalletPositions(address);
    
    // Validate response format
    if (!positions || typeof positions !== 'object') {
      throw new Error('Invalid response format from Zerion API');
    }

    return res.status(200).json({
      positions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Portfolio analysis failed:', error);
    return res.status(500).json({ 
      error: 'Failed to analyze portfolio',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
} 