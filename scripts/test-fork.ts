import { ethers } from 'ethers';
import { RPC_URLS } from '../utils/constants';

async function testFork() {
  try {
    // Connect to local fork
    const provider = new ethers.JsonRpcProvider(RPC_URLS.ethereum);
    
    // Get network info
    const network = await provider.getNetwork();
    console.log('Network:', {
      chainId: network.chainId,
      blockNumber: await provider.getBlockNumber()
    });

    // Test getting mainnet DAI balance
    const daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
    const daiContract = new ethers.Contract(
      daiAddress,
      ['function balanceOf(address) view returns (uint256)'],
      provider
    );
    
    // Check Maker DAO balance
    const makerDao = '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2';
    const balance = await daiContract.balanceOf(makerDao);
    console.log('MakerDAO DAI Balance:', ethers.formatEther(balance));

  } catch (error) {
    console.error('Fork test failed:', error);
  }
}

testFork().catch(console.error); 