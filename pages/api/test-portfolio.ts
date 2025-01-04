import { NextApiRequest, NextApiResponse } from "next";
import { ZerionService } from "../../utils/zerion";

// Initialize Zerion service
const zerion = new ZerionService(process.env.ZERION_API_KEY!);

// Test wallet with known testnet tokens
const TEST_WALLET = "0x2E1ab5C4D90bE44F0AD9a8077e49Cc8F6e0F9e8A";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log('Testing testnet portfolio for:', TEST_WALLET);
    
    // Test each chain
    const results = await Promise.all([
      zerion.getWalletPortfolio(TEST_WALLET, 'ethereum'),  // Sepolia
      zerion.getWalletPortfolio(TEST_WALLET, 'arbitrum'), // Arbitrum Sepolia
      zerion.getWalletPortfolio(TEST_WALLET, 'base')      // Base Goerli
    ]);

    return res.status(200).json({
      success: true,
      data: {
        sepolia: results[0],
        arbitrumSepolia: results[1],
        baseGoerli: results[2]
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Portfolio test error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
} 