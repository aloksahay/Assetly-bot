import { useState, useCallback, useEffect } from 'react'
import { ethers } from 'ethers'
import { EDUCHAIN_CONFIG } from '@/utils/constants'
import { PortfolioManager, PortfolioRecommendation } from '@/utils/portfolio-manager'

const SUBSCRIPTION_ADDRESS = process.env.NEXT_PUBLIC_SUBSCRIPTION_ADDRESS!

export function useWallet() {
  const [address, setAddress] = useState<string>('')
  const [balance, setBalance] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<PortfolioRecommendation[]>([])

  const fetchBalance = useCallback(async (address: string) => {
    try {
      const provider = new ethers.JsonRpcProvider(EDUCHAIN_CONFIG.rpcUrls[0])
      const balance = await provider.getBalance(address)
      setBalance(ethers.formatEther(balance))
    } catch (err) {
      console.error('Error fetching balance:', err)
    }
  }, [])

  const checkSubscription = useCallback(async (walletAddress: string) => {
    try {
      const provider = new ethers.JsonRpcProvider(EDUCHAIN_CONFIG.rpcUrls[0])
      
      // Get transactions sent to subscription address
      const filter = await provider.getBalance(SUBSCRIPTION_ADDRESS)
      
      // Get transaction history
      const history = await provider.getHistory(walletAddress)
      
      // Check if any transaction was sent to subscription address with correct amount
      const hasSubscribed = history.some(tx => 
        tx.to?.toLowerCase() === SUBSCRIPTION_ADDRESS.toLowerCase() &&
        tx.value === ethers.parseUnits('0.001', 'ether')
      )

      setIsSubscribed(hasSubscribed)
      
      // Also check localStorage as backup
      if (!hasSubscribed) {
        const storedSubscription = localStorage.getItem(`subscription_${walletAddress.toLowerCase()}`)
        if (storedSubscription) {
          setIsSubscribed(true)
        }
      }
    } catch (err) {
      console.error('Error checking subscription:', err)
      // Fallback to localStorage if blockchain check fails
      const storedSubscription = localStorage.getItem(`subscription_${walletAddress.toLowerCase()}`)
      if (storedSubscription) {
        setIsSubscribed(true)
      }
    }
  }, [])

  useEffect(() => {
    if (address) {
      fetchBalance(address)
      checkSubscription(address)
    }
  }, [address, fetchBalance, checkSubscription])

  const connectWallet = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask to connect your wallet')
      }

      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      })

      const address = accounts[0]
      setAddress(address)

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: EDUCHAIN_CONFIG.chainId }],
        })
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [EDUCHAIN_CONFIG]
          })
        } else {
          throw switchError
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet')
    } finally {
      setLoading(false)
    }
  }, [])

  const sendTransaction = useCallback(async () => {
    if (!window.ethereum || !address) {
      setError('Please connect your wallet first')
      return
    }

    if (!SUBSCRIPTION_ADDRESS) {
      setError('Subscription address not configured')
      return
    }

    setLoading(true)
    setError('')

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      const tx = await signer.sendTransaction({
        to: SUBSCRIPTION_ADDRESS,
        value: ethers.parseUnits('0.001', 'ether')
      })

      await tx.wait()
      await fetchBalance(address)
      setIsSubscribed(true)
      // Store subscription status in localStorage
      localStorage.setItem(`subscription_${address.toLowerCase()}`, 'true')
      alert('Subscription successful!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed')
    } finally {
      setLoading(false)
    }
  }, [address, fetchBalance])

  const analyzePortfolio = useCallback(async () => {
    if (!address) return
    
    setLoading(true)
    setError('')
    setRecommendations([]) // Clear previous recommendations

    try {
      const response = await fetch('/api/analyze-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch portfolio')
      }

      const data = await response.json()
      setAnalysisResults(data.positions)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }, [address])

  return {
    address,
    balance,
    loading,
    error,
    isSubscribed,
    connectWallet,
    sendTransaction,
    analyzePortfolio,
    analysisResults,
    recommendations,
    setRecommendations,
    setError
  }
} 