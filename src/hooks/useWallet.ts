import { useState, useCallback, useEffect } from 'react';
import { createPublicClient, http, formatEther } from 'viem';
import { sepolia } from 'viem/chains';
import { NETWORK_CONFIG } from '@/utils/constants';
import { PortfolioManager, PortfolioRecommendation } from '@/utils/portfolio-manager';
import { ethers } from 'ethers';

// Create a public client for Sepolia
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(`https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY}`)
});

export function useWallet() {
  const [address, setAddress] = useState<string>('');
  const [balance, setBalance] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<PortfolioRecommendation[]>([]);
  const [chainId, setChainId] = useState<string>('');
  const [alert, setAlert] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);

  const fetchBalance = useCallback(async (address: string) => {
    try {
      console.log('Fetching balance for address:', address);
      
      // Get balance using the already created publicClient
      const balanceWei = await publicClient.getBalance({
        address: address as `0x${string}`,
      });
      
      console.log('Raw balance (Wei):', balanceWei);
      const formattedBalance = parseFloat(formatEther(balanceWei)).toFixed(4);
      console.log('Formatted balance:', formattedBalance);
      
      setBalance(`${formattedBalance} ETH`);
    } catch (err) {
      console.error('Balance fetch error:', err);
      setBalance('Error fetching balance');
    }
  }, []);

  useEffect(() => {
    if (address) {
      fetchBalance(address);
    }
  }, [address, fetchBalance]);

  const disconnect = useCallback(() => {
    setAddress('');
    setBalance('');
    setAnalysisResults(null);
    setRecommendations([]);
    setChainId('');
    localStorage.removeItem('walletConnected');
  }, []);

  const connectWallet = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask to connect your wallet');
      }

      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      const address = accounts[0];
      setAddress(address);

      // Get chain ID
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      setChainId(chainId);

      // Switch to Sepolia if not already on it
      if (chainId !== NETWORK_CONFIG['Ethereum Sepolia'].chainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: NETWORK_CONFIG['Ethereum Sepolia'].chainId }],
          });
        } catch (switchError: any) {
          // If network doesn't exist, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [NETWORK_CONFIG['Ethereum Sepolia']],
            });
          } else {
            throw switchError;
          }
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  }, []);

  const analyzePortfolio = async () => {
    if (!address) return null;
    
    setLoading(true);
    setError('');
    setRecommendations([]); // Clear previous recommendations

    try {
      const response = await fetch('/api/analyze-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch portfolio');
      }

      const data = await response.json();
      console.log('Portfolio data received:', data); // Debug log
      
      // Make sure we're setting the correct data structure
      if (data && data.positions) {
        setAnalysisResults(data.positions);
        return data.positions;
      } else {
        setAnalysisResults(data);
        return data;
      }
    } catch (err) {
      console.error('Analysis error:', err); // Debug log
      setError(err instanceof Error ? err.message : 'Analysis failed');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    address,
    balance,
    loading,
    error,
    connectWallet,
    analyzePortfolio,
    analysisResults,
    recommendations,
    setRecommendations,
    setError,
    disconnect,
    chainId,
    alert
  };
}