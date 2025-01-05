import { useState, useCallback, useEffect } from 'react'
import { ethers } from 'ethers'
import { EDUCHAIN_CONFIG } from '@/utils/constants'

export function useWallet() {
  const [address, setAddress] = useState<string>('')
  const [balance, setBalance] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  // Function to fetch balance
  const fetchBalance = useCallback(async (address: string) => {
    try {
      const provider = new ethers.JsonRpcProvider(EDUCHAIN_CONFIG.rpcUrls[0])
      const balance = await provider.getBalance(address)
      setBalance(ethers.formatEther(balance))
    } catch (err) {
      console.error('Error fetching balance:', err)
    }
  }, [])

  // Update balance when address changes
  useEffect(() => {
    if (address) {
      fetchBalance(address)
    }
  }, [address, fetchBalance])

  const connectWallet = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('Please install MetaMask to connect your wallet')
      }

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      })

      // Get the first account
      const address = accounts[0]
      setAddress(address)

      // Switch to EduChain network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: EDUCHAIN_CONFIG.chainId }],
        })
      } catch (switchError: any) {
        // If the network doesn't exist, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [EDUCHAIN_CONFIG]
          })
        } else {
          throw switchError
        }
      }

      // Fetch initial balance
      await fetchBalance(address)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet')
    } finally {
      setLoading(false)
    }
  }, [fetchBalance])

  return {
    address,
    balance,
    loading,
    error,
    connectWallet
  }
} 