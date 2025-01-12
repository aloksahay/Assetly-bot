import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { EDUCHAIN_CONFIG } from '@/utils/constants';
import { PortfolioManager, PortfolioRecommendation } from '@/utils/portfolio-manager';

const SUBSCRIPTION_ADDRESS = process.env.NEXT_PUBLIC_SUBSCRIPTION_ADDRESS!;

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
      const provider = new ethers.JsonRpcProvider(EDUCHAIN_CONFIG.rpcUrls[0]);
      const balance = await provider.getBalance(address);
      setBalance(ethers.formatEther(balance));
    } catch (err) {
      console.error('Error fetching balance:', err);
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

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: EDUCHAIN_CONFIG.chainId }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [EDUCHAIN_CONFIG]
          });
        } else {
          throw switchError;
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  }, []);

  const sendTransaction = useCallback(async () => {
    if (!window.ethereum || !address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!SUBSCRIPTION_ADDRESS) {
      setError('Subscription address not configured');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const tx = await signer.sendTransaction({
        to: SUBSCRIPTION_ADDRESS,
        value: ethers.parseUnits('0.001', 'ether')
      });

      await tx.wait();
      await fetchBalance(address);
      setAlert({ message: 'Subscription successful!', variant: 'success' });
      setTimeout(() => setAlert(null), 3000); // Hide after 3 seconds
    } catch (err) {
      setAlert({ message: err instanceof Error ? err.message : 'Transaction failed', variant: 'error' });
      setTimeout(() => setAlert(null), 3000);
    } finally {
      setLoading(false);
    }
  }, [address, fetchBalance]);

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