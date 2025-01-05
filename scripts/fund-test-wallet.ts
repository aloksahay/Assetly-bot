import { ethers } from 'ethers';
import { RPC_URLS } from '../utils/constants';

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

const TOKENS = {
  USDC: {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    whale: '0x55FE002aefF02F77364de339a1292923A15844B8', // USDC whale
    amount: '800'
  },
  LINK: {
    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    whale: '0xF977814e90dA44bFA03b6295A0616a897441aceC', // Chainlink whale
    amount: '1500'
  }
};

async function fundTestWallet(testWalletAddress: string) {
  const provider = new ethers.JsonRpcProvider(RPC_URLS.ethereum);

  for (const [symbol, token] of Object.entries(TOKENS)) {
    // Impersonate the whale
    await provider.send('anvil_impersonateAccount', [token.whale]);
    const whaleSigner = await provider.getSigner(token.whale);

    // Get token contract
    const tokenContract = new ethers.Contract(token.address, ERC20_ABI, whaleSigner);
    const decimals = await tokenContract.decimals();
    
    // Transfer tokens
    const amount = ethers.parseUnits(token.amount, decimals);
    const tx = await tokenContract.transfer(testWalletAddress, amount);
    await tx.wait();

    console.log(`Transferred ${token.amount} ${symbol} to ${testWalletAddress}`);
  }
}

// Get test wallet address from command line
const testWallet = process.argv[2];
if (!testWallet) {
  console.error('Please provide test wallet address');
  process.exit(1);
}

fundTestWallet(testWallet)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Funding failed:', error);
    process.exit(1);
  }); 