import { NextApiRequest, NextApiResponse } from "next";
import { ZerionService } from "../../utils/zerion";

// Initialize Zerion service
const zerion = new ZerionService(process.env.ZERION_API_KEY!);

// Test wallet address - you can replace this with any address you want to test
const TEST_WALLET = "0x9a0aAf34B24e8f2A999B23bd033007F17E1DA2ad";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log('Fetching portfolio for wallet:', TEST_WALLET);
    
    // Get wallet portfolio from Zerion
    const portfolio = await zerion.getWalletPortfolio(TEST_WALLET);

    console.log('Portfolio response:', {
      nativeBalance: portfolio.nativeBalance,
      tokenCount: portfolio.tokens.length,
      totalValue: portfolio.totalValueUSD
    });

    return res.status(200).json({
      success: true,
      data: portfolio,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Portfolio fetch error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
} 