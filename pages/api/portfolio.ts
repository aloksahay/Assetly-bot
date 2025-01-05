import { NextApiRequest, NextApiResponse } from 'next';
import { PortfolioService } from '../../utils/portfolio';

const portfolioService = new PortfolioService();

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

    const portfolio = await portfolioService.getPortfolio(address, chain);

    return res.status(200).json({
      success: true,
      data: portfolio,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Portfolio Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 