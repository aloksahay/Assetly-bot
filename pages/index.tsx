import { Button } from "@/components/ui/button"
import { useWallet } from "@/hooks/useWallet"
import { EDUCHAIN_CONFIG } from "@/utils/constants"
import { useState } from 'react'
import { AaveService } from "@/utils/aave"
import { ethers } from "ethers"

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
  const formatAssets = (data: any) => {
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <header className="sticky top-0 z-50 w-full border-b border-gray-800 backdrop-blur-sm bg-gray-900/75">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-xl font-medium bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                Assetly: Your DeFi Agent
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {address && balance && (
                <div className="text-sm text-gray-300">
                  <span className="font-medium">{parseFloat(balance).toFixed(4)} EDU</span>
                </div>
              )}
              <Button 
                variant="outline"
                onClick={connectWallet}
                disabled={loading}
                className="rounded-full bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0 font-medium px-6 hover:opacity-90 transition-opacity"
              >
                {loading ? 'Connecting...' : address ? `${address.slice(0,6)}...${address.slice(-4)}` : 'Connect Wallet'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        {error && (
          <div className="rounded-lg bg-red-500/10 p-4 text-red-400 border border-red-500/20">
            {error}
          </div>
        )}

        {address && (
          <div className="rounded-xl bg-gray-800/50 shadow-xl backdrop-blur-sm border border-gray-700/50 p-6">
            <h2 className="text-lg font-medium mb-4 text-white">Wallet Details</h2>
            <div className="space-y-2 text-gray-300">
              <p><span className="font-medium">Address:</span> {address}</p>
              <p><span className="font-medium">Balance:</span> {balance} EDU</p>
              <p><span className="font-medium">Network:</span> {EDUCHAIN_CONFIG.chainName}</p>
            </div>
            <div className="flex gap-4 mt-4">
              {!isSubscribed && (
                <Button 
                  variant="default"
                  onClick={sendTransaction}
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-500 to-violet-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Subscribe (0.001 EDU)
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Portfolio Analysis Section */}
        {address && (
          <div className="rounded-xl bg-gray-800/50 shadow-xl backdrop-blur-sm border border-gray-700/50 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-white">Portfolio Analysis</h2>
              <Button
                variant="outline"
                onClick={analyzePortfolio}
                disabled={loading}
                className="bg-white/10 text-white hover:bg-white/20 rounded-lg border-0 transition-colors"
              >
                {loading ? 'Analyzing...' : 'Analyze Portfolio'}
              </Button>
            </div>

            {analysisResults && assets.length > 0 ? (
              <>
                <div className="space-y-6">
                  {/* Native Assets Section */}
                  <div className="rounded-lg bg-gray-900/50 p-4">
                    <h3 className="text-md font-medium text-gray-300 mb-4">Native Assets</h3>
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
                  <div className="rounded-lg bg-gray-900/50 p-4">
                    <h3 className="text-md font-medium text-gray-300 mb-4">Tokens</h3>
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
                                  
                                  const tx = await aave.deposit(
                                    testAmount.toString(),
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
                <div className="mt-6 pt-6 border-t border-gray-700">
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
                    className="w-full bg-gradient-to-r from-blue-500 to-violet-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Get Recommendations
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-gray-400 text-center py-8">
                {loading ? 'Loading portfolio...' : 'Click Analyze Portfolio to view your assets'}
              </p>
            )}
          </div>
        )}

        {/* Raw Response Section */}
        {rawResponse && (
          <div className="rounded-xl bg-gray-800/50 shadow-xl backdrop-blur-sm border border-gray-700/50 p-6">
            <h2 className="text-lg font-medium mb-4 text-white">AI Response</h2>
            <pre className="bg-gray-900/50 p-4 rounded-lg overflow-auto max-h-[500px] text-sm text-gray-300 border border-gray-700/50">
              {rawResponse}
            </pre>
          </div>
        )}
      </main>
    </div>
  )
} 