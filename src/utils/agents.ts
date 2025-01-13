import { BrianSDK } from '@brian-ai/sdk';

// Base agent configuration
const brianSDK = new BrianSDK({
  apiKey: process.env.BRIAN_API_KEY!
});

// Different agent types
export const agents = {
  // Portfolio analysis agent
  portfolio: async (address: string, chain: string) => {
    return brianSDK.ask({
      prompt: `Analyze this portfolio on ${chain}:
        - Address: ${address}
        - Show total value
        - List all tokens and balances
        - Identify major positions`,
      kb: "public-knowledge-box"
    });
  },

  // Trading strategy agent  
  trading: async (address: string, chain: string) => {
    return brianSDK.ask({
      prompt: `Analyze trading opportunities for ${address} on ${chain}:
        - Current market conditions
        - Potential entry/exit points
        - Risk assessment
        - Recommended trades`,
      kb: "public-knowledge-box"
    });
  },

  // DeFi optimization agent
  defi: async (address: string, chain: string) => {
    return brianSDK.ask({
      prompt: `Find DeFi opportunities for ${address} on ${chain}:
        - Best yield farming positions
        - Lending opportunities
        - Liquidity pools analysis
        - Risk/reward ratios`,
      kb: "public-knowledge-box"
    });
  },

  // Research and analysis agent
  research: async (address: string, chain: string) => {
    return brianSDK.ask({
      prompt: `Research this portfolio on ${chain}:
        - Token fundamentals
        - Protocol analysis
        - Market trends
        - Risk factors`,
      kb: "public-knowledge-box"
    });
  },

  aave: async (address: string, chain: string) => {
    return brianSDK.ask({
      prompt: `Analyze Aave opportunities for ${address} on ${chain}:
        - Current positions
        - Health factor
        - Borrowing power
        - Best yield opportunities
        - Risk assessment
        - Liquidation risks`,
      kb: "public-knowledge-box"
    });
  }
}; 