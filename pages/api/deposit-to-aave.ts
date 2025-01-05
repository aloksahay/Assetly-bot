import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { address, amount, symbol, chainId } = req.body

    // Log the request details
    console.log('Deposit request:', {
      address,
      amount,
      symbol,
      chainId,
      timestamp: new Date().toISOString()
    })

    // Verify we're on Sepolia using decimal chain ID
    if (chainId !== 11155111) {
      throw new Error('Must be on Sepolia network')
    }

    const brianRequest = {
      prompt: `deposit ${amount} ${symbol} to aave on sepolia testnet`,
      address: address,
      chainId: chainId
    }

    // Log the request to Brian AI
    console.log('Brian AI request:', brianRequest)

    const response = await fetch('https://api.brianknows.org/api/v0/agent/transaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-brian-api-key': process.env.BRIAN_API_KEY!
      },
      body: JSON.stringify(brianRequest)
    })

    // Log the raw response
    const rawResponse = await response.text()
    console.log('Raw Brian AI response:', rawResponse)

    if (!response.ok) {
      throw new Error(`Failed to get deposit transaction: ${rawResponse}`)
    }

    // Parse and log the JSON response
    const data = JSON.parse(rawResponse)
    console.log('Parsed Brian AI response:', JSON.stringify(data, null, 2))
    
    return res.status(200).json(data)

  } catch (error) {
    console.error('Deposit transaction failed:', error)
    return res.status(500).json({ 
      error: 'Failed to create deposit transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 