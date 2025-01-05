import { useState, useCallback, useEffect } from 'react'
import { ethers } from 'ethers'
import { EDUCHAIN_CONFIG } from '@/utils/constants'

const SUBSCRIPTION_ADDRESS = process.env.NEXT_PUBLIC_SUBSCRIPTION_ADDRESS!

export function useWallet() {
  const [address, setAddress] = useState<string>('')
  const [balance, setBalance] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [isSubscribed, setIsSubscribed] = useState(false)

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
      
      const filter = {
        address: SUBSCRIPTION_ADDRESS,
        fromBlock: -100,
        toBlock: 'latest'
      }

      const logs = await provider.getLogs(filter)
      
      const hasSubscribed = logs.some(log => 
        log.topics.includes(walletAddress.toLowerCase())
      )

      setIsSubscribed(hasSubscribed)
    } catch (err) {
      console.error('Error checking subscription:', err)
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
      fetchBalance(address)
      setIsSubscribed(true)
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

    try {
      const response = await fetch('/api/analyze-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      })

      if (!response.ok) {
        throw new Error('Failed to analyze portfolio')
      }

      const data = await response.json()
      console.log('Portfolio analysis:', data)
      
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
    analyzePortfolio
  }
} 