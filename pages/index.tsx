import { Button } from "@/components/ui/button"
import { useWallet } from "@/hooks/useWallet"
import { EDUCHAIN_CONFIG } from "@/utils/constants"
import { useState, useEffect } from 'react'
import { AaveService } from "@/utils/aave"
import { ethers } from "ethers"
import { Terminal } from '@/components/Terminal'
import { Alert } from "@/components/ui/alert"
import { DepositModal } from '@/components/DepositModal'
import { PortfolioAnalyzer } from '@/lib/portfolio/PortfolioAnalyzer'
import { useAgent } from '@/hooks/useAgent'

// Add interface for asset type
interface Asset {
  symbol: string;
  name: string;
  quantity: number;
  valueUSD: number;
  isNative: boolean;
  displayable: boolean;
}

export default function HomePage() {
  const { 
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
  } = useWallet()

  const [rawResponse, setRawResponse] = useState<string>('')
  const [logs, setLogs] = useState<Array<{ message: string; timestamp: string; type?: 'info' | 'error' | 'success' }>>([])
  const [depositModal, setDepositModal] = useState<{
    isOpen: boolean;
    symbol: string;
    balance: string;
  } | null>(null);
  const [isDepositing, setIsDepositing] = useState(false)
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const { agent } = useAgent();

  const addLog = (message: string, type?: 'info' | 'error' | 'success') => {
    setLogs(prev => [...prev, {
      message,
      timestamp: new Date().toLocaleTimeString(),
      type
    }])
  }

  const handleAnalyzePortfolio = async () => {
    addLog('Starting portfolio inspection with Zerion API...')
    try {
      const results = await analyzePortfolio()
      if (results) {
        addLog('Portfolio inspection complete', 'success')
        // Optionally trigger AI analysis automatically
        if (agent) {
          addLog('Starting AI portfolio analysis...');
          try {
            const analyzer = new PortfolioAnalyzer(agent);
            const portfolioAnalysis = await analyzer.analyzePortfolio(results.data);
            
            if (portfolioAnalysis) {
              setAnalysis(portfolioAnalysis);
              addLog('AI analysis complete', 'success');
            }
          } catch (err) {
            addLog(`AI analysis failed: ${err}`, 'error');
          }
        }
      }
    } catch (err) {
      addLog(`Inspection failed: ${err}`, 'error')
    }
  }

  const handleConnect = async () => {
    addLog('Connecting wallet...')
    try {
      await connectWallet()
      addLog('Wallet connected successfully', 'success')
    } catch (err) {
      addLog(`Failed to connect wallet: ${err}`, 'error')
    }
  }

  const handleDisconnect = async () => {
    addLog('Disconnecting wallet...')
    try {
      disconnect()
      addLog('Wallet disconnected successfully', 'success')
    } catch (err) {
      addLog(`Failed to disconnect wallet: ${err}`, 'error')
    }
  }

  // Format assets from Zerion response
  const formatAssets = (data: any): Asset[] => {
    if (!data?.data) return [];
    
    return data.data
      .filter((position: any) => 
        !position.attributes.flags.is_trash
      )
      .map((position: any): Asset => ({
        symbol: position.attributes.fungible_info.symbol,
        name: position.attributes.fungible_info.name,
        quantity: position.attributes.quantity.numeric,
        valueUSD: position.attributes.value,
        isNative: position.attributes.fungible_info.implementations.some(
          (impl: any) => impl.address === null
        ),
        displayable: position.attributes.flags.displayable
      }));
  }

  const assets = analysisResults ? formatAssets(analysisResults) : []

  const handleDeposit = async (amount: string) => {
    setIsDepositing(true)
    addLog(`Initiating deposit of ${amount} ${depositModal?.symbol} to AAVE...`)
    try {
      if (!window.ethereum) throw new Error('Please install MetaMask')

      // Request network change first
      addLog('Switching to Sepolia network...')
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }], // Sepolia
        })
        addLog('Successfully switched to Sepolia', 'success')
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          addLog('Adding Sepolia network...')
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia',
              nativeCurrency: {
                name: 'Sepolia ETH',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: ['https://sepolia.infura.io/v3/']
            }]
          })
          addLog('Successfully added Sepolia network', 'success')
        } else {
          throw switchError
        }
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const aave = new AaveService(provider)
      
      const decimals = depositModal?.symbol === 'USDC' ? 6 : 18
      const depositAmount = ethers.parseUnits(Number(amount).toFixed(2), decimals)
      
      addLog('Approving AAVE to spend tokens...')
      const tx = await aave.deposit(
        depositAmount.toString(),
        signer
      )

      addLog('Waiting for deposit confirmation...')
      await tx.wait()
      addLog('Deposit successful!', 'success')
      setDepositModal(null)

      // Refresh both portfolio and recommendations
      addLog('Refreshing portfolio data...')
      await handleAnalyzePortfolio()
      
      // If we have existing recommendations, refresh them
      if (rawResponse) {
        addLog('Updating yield recommendations...')
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
          addLog('Updated Assetly recommendations after deposit', 'success')
          setRawResponse(JSON.stringify(data, null, 2));
        } catch (err) {
          addLog(`Failed to update recommendations: ${err}`, 'error')
        }
      }
      
    } catch (err) {
      addLog(`Deposit failed: ${err}`, 'error')
      setError(err instanceof Error ? err.message : 'Failed to deposit')
    } finally {
      setIsDepositing(false)
    }
  }

  useEffect(() => {
    if (analysisResults && agent) {
      const analyzer = new PortfolioAnalyzer(agent);
      
      const analyzePortfolio = async () => {
        const portfolioAnalysis = await analyzer.analyzePortfolio(analysisResults.data);
        setAnalysis(portfolioAnalysis);
      };

      analyzePortfolio();

      // Set up interval for continuous monitoring
      const interval = setInterval(analyzePortfolio, 5 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [analysisResults, agent]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <header className="sticky top-0 z-50 w-full border-b border-gray-800 backdrop-blur-sm bg-gray-900/75">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-xl font-medium bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                Assetly: Your DeFi Portfolio Agent
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {address && balance && (
                <div className="text-sm text-gray-300">
                  <span className="font-medium">{parseFloat(balance).toFixed(4)} EDU</span>
                </div>
              )}
              {address ? (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline"
                    onClick={handleDisconnect}
                    disabled={loading}
                    className="rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 font-medium px-6 hover:opacity-90 transition-opacity"
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline"
                  onClick={handleConnect}
                  disabled={loading}
                  className="rounded-full bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0 font-medium px-6 hover:opacity-90 transition-opacity"
                >
                  {loading ? 'Connecting...' : 'Connect Wallet'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        {error && (
          <div className="rounded-lg bg-red-500/10 p-4 text-red-400 border border-red-500/20">
            {error}
          </div>
        )}

        {address && (
          <div className="rounded-xl bg-white/5 shadow-2xl backdrop-blur-lg border border-white/10 p-6 hover:bg-white/10 hover:scale-[1.01] hover:shadow-3xl transition-all duration-300 ease-out">
            <h2 className="text-lg font-medium mb-4 text-white">Wallet Details</h2>
            <div className="space-y-2 text-gray-300">
              <p><span className="font-medium">Address:</span> {address}</p>
              <p><span className="font-medium">Balance:</span> {balance} EDU</p>
              <p><span className="font-medium">Chain ID:</span> {chainId}</p>
            </div>
          </div>
        )}

        {/* Portfolio Inspection Section */}
        {address && (
          <div className="rounded-xl bg-white/5 shadow-2xl backdrop-blur-lg border border-white/10 p-6 hover:bg-white/10 hover:scale-[1.01] hover:shadow-3xl transition-all duration-300 ease-out">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-white">Portfolio Inspection</h2>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={handleAnalyzePortfolio}
                  disabled={loading}
                  className="rounded-full bg-gradient-to-r from-emerald-600 to-green-700 text-white border-0 font-medium px-6 hover:opacity-90 transition-opacity"
                >
                  {loading ? 'Analyzing...' : 'Get Assetly Recommendations'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!analysisResults) {
                      addLog('Please analyze portfolio first', 'error');
                      return;
                    }
                    
                    addLog('Starting AI portfolio analysis...');
                    try {
                      const response = await fetch('/api/agent-analysis', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          portfolioData: analysisResults 
                        })
                      });

                      if (!response.ok) {
                        throw new Error('Failed to get AI analysis');
                      }

                      const aiAnalysis = await response.json();
                      setAnalysis({
                        assessment: aiAnalysis.assessment,
                        opportunities: aiAnalysis.opportunities,
                        strategy: aiAnalysis.strategy,
                        timestamp: aiAnalysis.timestamp,
                      });
                      addLog('AI analysis complete', 'success');
                    } catch (err) {
                      console.error('AI analysis error:', err);
                      addLog(`AI analysis failed: ${err}`, 'error');
                    }
                  }}
                  disabled={loading || !analysisResults}
                  className="rounded-full bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0 font-medium px-6 hover:opacity-90 transition-opacity"
                >
                  AI Analysis
                </Button>
              </div>
            </div>

            {analysisResults && assets.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-6">
                  {/* Native Assets Section */}
                  <div className="rounded-lg bg-black/20 backdrop-blur-md p-4 border border-white/5 hover:bg-black/30 transition-colors duration-200">
                    <h3 className="text-md font-medium text-gray-300 mb-4">Native Assets</h3>
                    {assets.filter(a => a.isNative).map((asset, idx) => (
                      <div key={`native-${idx}`} 
                        className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-white/5 transition-colors duration-200"
                      >
                        <div>
                          <p className="font-medium text-white">{asset.symbol}</p>
                          <p className="text-sm text-gray-300">{asset.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-white">
                            {Number(asset.quantity).toFixed(2)} {asset.symbol}
                          </p>
                          {asset.valueUSD !== null && (
                            <p className="text-sm text-gray-300">
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
                  <div className="rounded-lg bg-black/20 backdrop-blur-md p-4 border border-white/5 hover:bg-black/30 transition-colors duration-200">
                    <h3 className="text-md font-medium text-gray-300 mb-4">Tokens</h3>
                    {assets.filter(a => !a.isNative).map((asset, idx) => (
                      <div key={`token-${idx}`} 
                        className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-white/5 transition-colors duration-200"
                      >
                        <div>
                          <p className="font-medium text-white">{asset.symbol}</p>
                          <p className="text-sm text-gray-300">{asset.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-white">
                            {Number(asset.quantity).toFixed(2)} {asset.symbol}
                          </p>
                          {asset.valueUSD !== null && (
                            <p className="text-sm text-gray-300">
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
                </div>

                {/* Get Recommendations Button */}
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <Button
                    variant="default"
                    className="w-full bg-gradient-to-r from-blue-500 to-violet-500 text-white rounded-lg hover:scale-[1.02] hover:shadow-lg transition-all duration-200"
                    onClick={async () => {
                      addLog('Fetching recommendations based on portfolio inspection...')
                      addLog('Assetly analyzing portfolio for optimal yield and risk strategies...', 'info')
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
                        addLog('Assetly recommends AAVE for optimal risk-adjusted yield', 'success')
                        setRawResponse(JSON.stringify(data, null, 2));
                      } catch (err) {
                        addLog(`Failed to get recommendations: ${err}`, 'error')
                        setError(err instanceof Error ? err.message : 'Failed to get recommendations');
                      }
                    }}
                    disabled={loading}
                  >
                    Get Assetly recommendations for Portfolio
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

        {/* Assetly Recommendations Section */}
        {rawResponse && (
          <div className="rounded-xl bg-white/5 shadow-2xl backdrop-blur-lg border border-white/10 p-6 hover:bg-white/10 hover:scale-[1.01] hover:shadow-3xl transition-all duration-300 ease-out">
            <h2 className="text-lg font-medium mb-6 text-white">Assetly recommends</h2>
            
            {JSON.parse(rawResponse).recommendations.map((rec: any, idx: number) => (
              <div key={idx} className="space-y-4">
                {/* Recommendation Type Header */}
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium
                    ${rec.type === 'YIELD' ? 'bg-green-500/20 text-green-400' : 
                      rec.type === 'REBALANCE' ? 'bg-blue-500/20 text-blue-400' : 
                      'bg-yellow-500/20 text-yellow-400'}`}
                  >
                    {rec.type}
                  </span>
                  <h3 className="text-white font-medium">{rec.description}</h3>
                </div>

                {/* Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {rec.actions.map((action: any, actionIdx: number) => (
                    <div 
                      key={actionIdx}
                      className="bg-black/20 backdrop-blur-md rounded-lg p-4 border border-white/5 hover:bg-black/30 transition-all duration-200"
                    >
                      {/* Asset Balance */}
                      <div className="flex justify-between items-start mb-3">
                        <p className="text-white font-medium">
                          {action.description.split(' ')[0]} Balance: {Number(action.description.split(' ')[2]).toFixed(2)}
                        </p>
                        <span className={`px-2 py-1 rounded text-xs font-medium
                          ${action.risk === 'LOW' ? 'bg-green-500/20 text-green-400' : 
                            action.risk === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' : 
                            'bg-red-500/20 text-red-400'}`}
                        >
                          {action.risk} RISK
                        </span>
                      </div>

                      {/* APY Rate */}
                      {action.expectedReturn && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-400">Expected Return:</span>
                          <span className="text-green-400 font-medium">
                            {action.expectedReturn.replace('Current AAVE lending rate: ', '')}
                          </span>
                        </div>
                      )}

                      {/* Action Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDepositModal({
                          isOpen: true,
                          symbol: action.description.split(' ')[0],
                          balance: action.description.split(' ')[2]
                        })}
                        className="w-full mt-4 bg-gradient-to-r from-blue-500/10 to-violet-500/10 hover:from-blue-500/20 hover:to-violet-500/20 text-white border-white/10"
                      >
                        Deposit Now
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {depositModal && (
          <DepositModal
            isOpen={true}
            onClose={() => setDepositModal(null)}
            onDeposit={handleDeposit}
            balance={depositModal.balance}
            symbol={depositModal.symbol}
            isLoading={isDepositing}
          />
        )}

        {alert && <Alert message={alert.message} variant={alert.variant} />}

        {analysis && (
          <div className="mt-6 p-6 bg-white/5 shadow-2xl backdrop-blur-lg border border-white/10 rounded-xl hover:bg-white/10 hover:scale-[1.01] hover:shadow-3xl transition-all duration-300 ease-out">
            <h2 className="text-xl font-bold mb-4 text-white">Portfolio Analysis</h2>
            
            <div className="grid gap-6 text-gray-300">
              <div>
                <h3 className="font-semibold text-white mb-2">Initial Assessment</h3>
                <div className="whitespace-pre-wrap">
                  {analysis.assessment}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-2">Opportunity Analysis</h3>
                <div className="whitespace-pre-wrap">
                  {analysis.opportunities}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-2">Recommended Strategy</h3>
                <div className="whitespace-pre-wrap">
                  {analysis.strategy}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Terminal logs={logs} />
    </div>
  )
} 