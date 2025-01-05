import { Button } from "@/components/ui/button"
import { useWallet } from "@/hooks/useWallet"
import { EDUCHAIN_CONFIG } from "@/utils/constants"
import { PortfolioManager } from "@/utils/portfolio-manager"
import { useState } from 'react'
import { AaveService } from '@/utils/aave'
import { ethers } from 'ethers'

interface Asset {
  symbol: string
  name: string
  quantity: string
  valueUSD: number | null
  isNative: boolean
  displayable: boolean
}

export default function HomePage() {
  const { 
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
  } = useWallet()

  const [rawResponse, setRawResponse] = useState<string>('')

  // Format assets from Zerion response
  const formatAssets = (data: any): Asset[] => {
    if (!data?.data) return []
    
    return data.data
      .filter((position: any) => 
        position.attributes.flags.displayable && !position.attributes.flags.is_trash
      )
      .map((position: any) => ({
        symbol: position.attributes.fungible_info.symbol,
        name: position.attributes.fungible_info.name,
        quantity: position.attributes.quantity.numeric,
        valueUSD: position.attributes.value,
        isNative: position.attributes.fungible_info.implementations.some(
          (impl: any) => impl.address === null
        ),
        displayable: position.attributes.flags.displayable
      }))
  }

  const assets = analysisResults ? formatAssets(analysisResults) : []

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-slate-900">
                Assetly: Your DeFi Agent
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {address && balance && (
                <div className="text-sm text-slate-600">
                  <span className="font-medium">{parseFloat(balance).toFixed(4)} EDU</span>
                </div>
              )}
              <Button 
                variant="outline"
                onClick={connectWallet}
                disabled={loading}
                className="font-medium"
              >
                {loading ? 'Connecting...' : address ? `${address.slice(0,6)}...${address.slice(-4)}` : 'Connect Wallet'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="text-red-500 mb-4">
            {error}
          </div>
        )}
        {address && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Wallet Details</h2>
            <div className="space-y-2">
              <p><span className="font-medium">Address:</span> {address}</p>
              <p><span className="font-medium">Balance:</span> {balance} EDU</p>
              <p><span className="font-medium">Network:</span> {EDUCHAIN_CONFIG.chainName}</p>
            </div>
            <div className="flex gap-4 mt-4">
              {!isSubscribed ? (
                <Button 
                  variant="default"
                  onClick={sendTransaction}
                  disabled={loading}
                >
                  Subscribe (0.001 EDU)
                </Button>
              ) : null}
            </div>
          </div>
        )}
        {address && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Portfolio Analysis</h2>
              <Button
                variant="outline"
                onClick={analyzePortfolio}
                disabled={loading}
              >
                {loading ? 'Analyzing...' : 'Analyze Portfolio'}
              </Button>
            </div>

            {analysisResults && assets.length > 0 ? (
              <>
                <div className="space-y-4">
                  {/* Native Assets Section */}
                  <div>
                    <h3 className="text-md font-medium text-slate-700 mb-2">Native Assets</h3>
                    {assets.filter(a => a.isNative).map((asset, idx) => (
                      <div key={`native-${idx}`} className="flex justify-between items-center py-2">
                        <div>
                          <p className="font-medium">{asset.symbol}</p>
                          <p className="text-sm text-slate-500">{asset.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {parseFloat(asset.quantity).toFixed(4)} {asset.symbol}
                          </p>
                          {asset.valueUSD !== null && (
                            <p className="text-sm text-slate-500">
                              ${asset.valueUSD.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tokens Section */}
                  <div>
                    <h3 className="text-md font-medium text-slate-700 mb-2">Tokens</h3>
                    {assets.filter(a => !a.isNative).map((asset, idx) => (
                      <div key={`token-${idx}`} className="flex justify-between items-center py-2">
                        <div>
                          <p className="font-medium">{asset.symbol}</p>
                          <p className="text-sm text-slate-500">{asset.name}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-medium">
                              {parseFloat(asset.quantity).toFixed(4)} {asset.symbol}
                            </p>
                            {asset.valueUSD !== null && (
                              <p className="text-sm text-slate-500">
                                ${asset.valueUSD.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </p>
                            )}
                          </div>
                          {/* Add Deposit to AAVE button */}
                          {asset.symbol === 'USDC' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  if (!window.ethereum) throw new Error('Please install MetaMask')

                                  // Switch to Sepolia
                                  await window.ethereum.request({
                                    method: 'wallet_switchEthereumChain',
                                    params: [{ chainId: '0xaa36a7' }], // Sepolia
                                  })

                                  // Connect to Sepolia
                                  const provider = new ethers.BrowserProvider(window.ethereum)
                                  const signer = await provider.getSigner()
                                  
                                  const aave = new AaveService(provider)
                                  
                                  // Use 1 USDC for testing
                                  const testAmount = ethers.parseUnits("1.0", 6) // 1 USDC with 6 decimals
                                  console.log('Attempting to deposit 1 USDC...')
                                  
                                  // Get transaction
                                  const tx = await aave.deposit(
                                    testAmount,
                                    signer
                                  )

                                  console.log('Deposit transaction:', tx)
                                  
                                  // Get updated user data
                                  const userData = await aave.getUserData(address)
                                  console.log('Updated user data:', userData)

                                } catch (err) {
                                  console.error('Deposit error:', err)
                                  setError(err instanceof Error ? err.message : 'Failed to deposit')
                                }
                              }}
                            >
                              Deposit 1 USDC to AAVE
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Get Recommendations Button */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <Button
                    variant="default"
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/get-recommendations', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ portfolioData: analysisResults.data })
                        });

                        if (!response.ok) {
                          throw new Error('Failed to get recommendations');
                        }

                        const data = await response.json();
                        console.log('Raw recommendations response:', {
                          data,
                          portfolioData: analysisResults.data
                        });
                        setRawResponse(JSON.stringify(data, null, 2));
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Failed to get recommendations');
                      }
                    }}
                    disabled={loading}
                    className="w-full"
                  >
                    Get Recommendations
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-slate-500">
                {loading ? 'Loading portfolio...' : 'Click Analyze Portfolio to view your assets'}
              </p>
            )}
          </div>
        )}
        {rawResponse && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">AI Response</h2>
            <pre className="bg-slate-50 p-4 rounded overflow-auto max-h-[500px] text-sm">
              {rawResponse}
            </pre>
          </div>
        )}
      </main>
    </div>
  )
} 