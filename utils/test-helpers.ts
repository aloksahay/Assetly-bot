import { ethers } from 'ethers';
import { WHALES, RPC_URLS } from './constants';

export const provider = new ethers.JsonRpcProvider(RPC_URLS.ethereum);

export async function impersonateWhale(whaleAddress: string) {
  await provider.send("anvil_impersonateAccount", [whaleAddress]);
  return provider.getSigner(whaleAddress);
}

export async function fundTestWallet(address: string, amount: string) {
  const whaleSigner = await impersonateWhale(WHALES.ETH);
  await whaleSigner.sendTransaction({
    to: address,
    value: ethers.parseEther(amount)
  });
} 