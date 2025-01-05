import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { RPC_URLS } from '../../utils/constants';

// Common ERC20 ABI for balanceOf
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function decimals() view returns (uint8)'
];

// List of tokens we want to track
const TOKENS = [
  {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6
  },
  {
    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    symbol: 'LINK',
    name: 'Chainlink',
    decimals: 18
  }
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address } = req.body;
    const provider = new ethers.JsonRpcProvider(RPC_URLS.ethereum);

    // Get ETH balance
    const ethBalance = await provider.getBalance(address);
    
    // Get token balances
    const tokenBalances = await Promise.all(
      TOKENS.map(async (token) => {
        const contract = new ethers.Contract(
          token.address,
          ERC20_ABI,
          provider
        );
        const balance = await contract.balanceOf(address);
        const formattedBalance = ethers.formatUnits(balance, token.decimals);
        
        return {
          symbol: token.symbol,
          name: token.name,
          balance: formattedBalance
        };
      })
    );

    // Filter out zero balances
    const nonZeroTokens = tokenBalances.filter(
      token => parseFloat(token.balance) > 0
    );

    return res.status(200).json({
      nativeToken: {
        symbol: 'ETH',
        name: 'Ethereum',
        balance: ethers.formatEther(ethBalance)
      },
      tokens: nonZeroTokens
    });

  } catch (error) {
    console.error('Portfolio analysis failed:', error);
    return res.status(500).json({ 
      error: 'Failed to analyze portfolio',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 