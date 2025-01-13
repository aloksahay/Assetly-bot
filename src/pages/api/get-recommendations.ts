import type { NextApiRequest, NextApiResponse } from 'next'
import { PortfolioManager } from '@/utils/portfolio-manager'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { portfolioData } = req.body

    // Log incoming data
    console.log('Incoming portfolio data:', JSON.stringify(portfolioData, null, 2));

    if (!portfolioData) {
      return res.status(400).json({ error: 'Portfolio data is required' })
    }

    const portfolioManager = new PortfolioManager()
    const recommendations = await portfolioManager.analyzePortfolio(portfolioData)
    
    // Log recommendations before sending
    console.log('Generated recommendations:', JSON.stringify(recommendations, null, 2));
    
    return res.status(200).json({ recommendations })

  } catch (error) {
    console.error('Failed to get recommendations:', error)
    return res.status(500).json({ 
      error: 'Failed to analyze portfolio',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 