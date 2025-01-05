import { NextApiRequest, NextApiResponse } from 'next';
import { agents } from '../../utils/agents';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { agentType, portfolio, address, chain } = req.body;

    // Get analysis from the selected agent
    const analysis = await agents[agentType as keyof typeof agents](address, chain);

    return res.status(200).json({
      success: true,
      data: analysis,
      agentType,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Agent Analysis Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 