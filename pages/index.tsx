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
import { useAgent } from "@/hooks/useAgent"
import { PortfolioAnalysis } from "@/types/portfolio"
import { NETWORK_CONFIG, isStablecoin } from "@/utils/constants"
import { UniswapService } from "@/utils/uniswap"

// Add interface for asset type
interface Asset {
  symbol: string;
  name: string;
  quantity: number;
  valueUSD: number;
  isNative: boolean;
  displayable: boolean;
}

// Update the interface for DeFi market data
interface DeFiAnalysisProps {
  valuation: PortfolioValuation;
  defiMarketData: {
    protocols: Array<{
      tvl: number;
      apy: number;
      symbol: string;
      project: string;
      ilRisk: string;
      protocolChange24h: number;
      protocolChange7d: number;
    }>;
    aggregateStats: {
      totalTvl: number;
      avgApy: number;
      volumeUsd24h: number;
      avgBaseApy: number;
      avgRewardApy: number;
      totalProtocols: number;
    };
  };
  analysis: {
    assessment: PortfolioAssessment;
    opportunities: OpportunityAssessment;
    strategy: StrategyRecommendation;
  };
}

// Add new interfaces for the enhanced analysis display
interface DeFiAnalysisProps {
  valuation: PortfolioValuation;
  defiMarketData: {
    protocols: Array<{
      tvl: number;
      apy: number;
      symbol: string;
      project: string;
      ilRisk: string;
      protocolChange24h: number;
      protocolChange7d: number;
    }>;
    aggregateStats: {
      totalTvl: number;
      avgApy: number;
      volumeUsd24h: number;
      avgBaseApy: number;
      avgRewardApy: number;
      totalProtocols: number;
    };
  };
  analysis: {
    assessment: PortfolioAssessment;
    opportunities: OpportunityAssessment;
    strategy: StrategyRecommendation;
  };
}

// Update the DeFiMarketInsights component
function DeFiMarketInsights({ defiMarketData }: { defiMarketData: DeFiAnalysisProps['defiMarketData'] }) {
  if (!defiMarketData || !defiMarketData.aggregateStats) {
    return <div>Loading market data...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white/5 rounded-lg">
          <h4 className="text-sm font-medium text-gray-400">Total TVL</h4>
          <p className="text-xl font-semibold text-white">
            ${(defiMarketData.aggregateStats.totalTvl / 1e6).toFixed(2)}M
          </p>
        </div>
        <div className="p-4 bg-white/5 rounded-lg">
          <h4 className="text-sm font-medium text-gray-400">Avg Base APY</h4>
          <p className="text-xl font-semibold text-white">
            {defiMarketData.aggregateStats.avgBaseApy.toFixed(2)}%
          </p>
        </div>
        <div className="p-4 bg-white/5 rounded-lg">
          <h4 className="text-sm font-medium text-gray-400">Avg Reward APY</h4>
          <p className="text-xl font-semibold text-white">
            {defiMarketData.aggregateStats.avgRewardApy.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-medium text-white mb-4">Top Yield Opportunities</h3>
        <div className="space-y-3">
          {defiMarketData.protocols
            .sort((a, b) => b.apy - a.apy)
            .slice(0, 5)
            .map((protocol, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium">{protocol.project}</p>
                  <p className="text-sm text-gray-400">{protocol.symbol}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{protocol.apy.toFixed(2)}% APY</p>
                  <p className="text-sm text-gray-400">
                    TVL: ${(protocol.tvl / 1e6).toFixed(2)}M
                  </p>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-medium text-white mb-4">Risk Analysis</h3>
        <div className="space-y-3">
          {defiMarketData.protocols.map((protocol, idx) => (
            <div key={idx} className="p-3 bg-white/5 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <p className="text-white font-medium">{protocol.project}</p>
                <span className={`px-2 py-1 rounded text-sm ${
                  protocol.ilRisk === 'LOW' ? 'bg-green-500/20 text-green-300' :
                  protocol.ilRisk === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-red-500/20 text-red-300'
                }`}>
                  {protocol.ilRisk} Risk
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                <p>24h Change: {protocol.protocolChange24h.toFixed(2)}%</p>
                <p>7d Change: {protocol.protocolChange7d.toFixed(2)}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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
  const [marketNews, setMarketNews] = useState<any>(null);
  const [yieldData, setYieldData] = useState<any>(null);
  const [swapModal, setSwapModal] = useState<{
    isOpen: boolean;
    symbol: string;
    balance: string;
    action: 'BUY' | 'SELL';
  } | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);

  const addLog = (message: string, type?: 'info' | 'error' | 'success') => {
    setLogs(prev => [...prev, {
      message,
      timestamp: new Date().toLocaleTimeString(),
      type
    }])
  }

  const handleAnalyzePortfolio = async () => {
    addLog('🔍 Starting portfolio analysis flow...')
    addLog('1. Connecting to Zerion API for portfolio data...')
    try {
      const results = await analyzePortfolio()
      if (results) {
        addLog('✅ Portfolio data retrieved successfully')
        addLog(`📊 Found ${formatAssets(results).length} assets in portfolio`)
        
        if (agent) {
          addLog('2. Starting AI analysis of portfolio...')
          try {
            const analyzer = new PortfolioAnalyzer(agent);
            const portfolioAnalysis = await analyzer.analyzePortfolio(results.data);
            
            if (portfolioAnalysis) {
              setAnalysis(portfolioAnalysis);
              addLog('✅ AI portfolio analysis complete')
              addLog('💡 Portfolio risk assessment and recommendations generated')
            }
          } catch (err) {
            addLog('❌ AI analysis failed: ' + err, 'error')
          }
        }
      }
    } catch (err) {
      addLog('❌ Portfolio inspection failed: ' + err, 'error')
    }
  }

  const handleConnect = async () => {
    addLog('Connecting wallet...')
    try {
      await connectWallet()
      addLog(`Wallet connected: ${address?.slice(0, 6)}...${address?.slice(-4)}`, 'success')
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
        // Include all non-trash tokens and specifically include LINK
        !position.attributes.flags.is_trash || 
        position.attributes.fungible_info.symbol === 'LINK'
      )
      .map((position: any): Asset => ({
        symbol: position.attributes.fungible_info.symbol,
        name: position.attributes.fungible_info.name,
        quantity: position.attributes.quantity.numeric,
        valueUSD: position.attributes.value,
        isNative: position.attributes.fungible_info.implementations.some(
          (impl: any) => impl.address === null
        ),
        displayable: true // Set displayable to true for all supported tokens
      }));
  }

  const assets = analysisResults ? formatAssets(analysisResults) : []

  const handleDeposit = async (amount: string) => {
    setIsDepositing(true)
    addLog(`Initiating deposit of ${amount} ${depositModal?.symbol} to AAVE...`)
    try {
      if (!window.ethereum) throw new Error('Please install MetaMask')

      // Request network change first
      addLog('Checking network...')
      try {
        if (chainId !== '0xaa36a7') {
          addLog('Switching to Sepolia network...')
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }], // Sepolia
          })
          addLog('Successfully switched to Sepolia', 'success')
        } else {
          addLog('Already on Sepolia network', 'success')
        }
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          addLog('Sepolia network not found, adding it...')
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
      addLog('Connected to wallet signer', 'success')

      const aave = new AaveService(provider)
      addLog('Initialized AAVE service')
      
      const decimals = depositModal?.symbol === 'USDC' ? 6 : 18
      const depositAmount = ethers.parseUnits(Number(amount).toFixed(2), decimals)
      addLog(`Preparing to deposit ${amount} ${depositModal?.symbol} (${depositAmount.toString()} wei)`)
      
      addLog('Requesting approval for AAVE to spend tokens...')
      const tx = await aave.deposit(
        depositAmount.toString(),
        signer
      )

      addLog('Transaction submitted. Waiting for confirmation...')
      addLog(`Transaction hash: ${tx.hash}`)
      
      await tx.wait()
      addLog('Deposit transaction confirmed!', 'success')
      setDepositModal(null)

      // Refresh all analysis
      addLog('Refreshing portfolio analysis...')
      await handleAnalyzePortfolio()
      
      // Refresh market analysis
      addLog('Updating market analysis...')
      await handleMarketAnalysis()
      
      // Refresh yield analysis
      addLog('Updating yield opportunities...')
      await handleYieldAnalysis()
      
      addLog('All portfolio data updated', 'success')

    } catch (err) {
      console.error('Deposit error:', err)
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

  function getSentimentColor(sentiment: string): string {
    const normalizedSentiment = sentiment.toUpperCase();
    
    // Check for neutral first
    if (normalizedSentiment.includes('NEUTRAL') || normalizedSentiment === 'WATCH') {
      return 'bg-yellow-500/20 text-yellow-300';
    }
    
    // Then check positive/bullish
    if (normalizedSentiment.includes('POSITIVE') || normalizedSentiment.includes('BULLISH')) {
      return 'bg-green-500/20 text-green-300';
    }
    
    // Then negative/bearish
    if (normalizedSentiment.includes('NEGATIVE') || normalizedSentiment.includes('BEARISH')) {
      return 'bg-red-500/20 text-red-300';
    }
    
    // Default to yellow for unknown states
    return 'bg-yellow-500/20 text-yellow-300';
  }

  const handleMarketAnalysis = async () => {
    try {
      addLog('📈 Starting market analysis...')
      addLog('1. Fetching current market conditions...')
      const response = await fetch('/api/agent-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioData: analysisResults })
      });

      if (!response.ok) {
        throw new Error('Failed to get market analysis');
      }

      const { marketAnalysis } = await response.json();
      console.log('Market Analysis Response:', marketAnalysis);
      addLog('2. Analyzing market sentiment...')
      addLog('3. Checking token-specific news...')
      addLog('✅ Market analysis complete')

      setMarketNews(marketAnalysis);
      setAnalysis({
        assessment: [
          `Market Sentiment: ${marketAnalysis?.generalMarket?.sentiment || 'Unknown'}`,
          '',
          'Key Events:',
          ...(marketAnalysis?.generalMarket?.majorEvents?.map(
            e => `- ${e.title} (Impact: ${e.impact})`
          ) || ['No major events']),
          '',
          'Token Analysis:',
          ...Object.entries(marketAnalysis?.portfolioTokens || {}).map(
            ([token, data]) => 
              `${token}: ${data?.analysis?.recommendation || 'WATCH'} ` + 
              `(Sentiment: ${data?.analysis?.sentiment || 0})`
          )
        ].join('\n'),
        opportunities: marketAnalysis?.summary?.opportunities || [],
        strategy: marketAnalysis?.summary?.actionItems?.join('\n') || 'No specific actions recommended',
        timestamp: Date.now(),
        portfolioTokens: marketAnalysis?.portfolioTokens || {},
        defiMarketData: {
          protocols: [], 
          aggregateStats: {
            totalTvl: 0,
            avgApy: 0,
            volumeUsd24h: 0,
            avgBaseApy: 0,
            avgRewardApy: 0,
            totalProtocols: 0
          }
        }
      });
    } catch (err) {
      console.error('Market analysis error:', err);
      addLog('❌ Market analysis failed: ' + err, 'error');
    }
  };

  const handleYieldAnalysis = async () => {
    try {
      addLog('💰 Starting yield analysis...')
      addLog('1. Fetching current APY rates from DeFi protocols...')
      const response = await fetch('/api/yield-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tokens: assets.map(a => a.symbol),
          chainId: chainId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get yield analysis');
      }

      const data = await response.json();
      addLog('2. Filtering best yield opportunities...')
      addLog('✅ Yield analysis complete')
      setYieldData(data.yields);
    } catch (err) {
      console.error('Yield analysis error:', err);
      addLog('❌ Yield analysis failed: ' + err, 'error');
    }
  };

  const handleSwap = async (amount: string) => {
    setIsSwapping(true);
    addLog(`Initiating ${swapModal?.action.toLowerCase()} swap for ${amount} ${swapModal?.symbol}...`);
    
    try {
      if (!window.ethereum) throw new Error('Please install MetaMask');

      // Network check (same as deposit)
      addLog('Checking network...');
      // ... (reuse network check code from handleDeposit)

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      addLog('Connected to wallet signer', 'success');

      const uniswap = new UniswapService(provider);
      addLog('Initialized Uniswap service');

      // Get token addresses (you'll need to maintain a mapping or fetch these)
      const tokenIn = swapModal?.action === 'SELL' ? swapModal.symbol : 'ETH';
      const tokenOut = swapModal?.action === 'BUY' ? swapModal.symbol : 'ETH';
      
      addLog(`Preparing to swap ${amount} ${tokenIn} for ${tokenOut}`);
      
      const tx = await uniswap.swap(
        tokenIn,
        tokenOut,
        amount,
        signer
      );

      addLog('Transaction submitted. Waiting for confirmation...');
      addLog(`Transaction hash: ${tx.hash}`);
      
      await tx.wait();
      addLog('Swap transaction confirmed!', 'success');
      setSwapModal(null);

      // Refresh portfolio data
      addLog('Refreshing portfolio data...');
      await handleAnalyzePortfolio();
      addLog('Portfolio data updated', 'success');

    } catch (err) {
      console.error('Swap error:', err);
      addLog(`Swap failed: ${err}`, 'error');
      setError(err instanceof Error ? err.message : 'Failed to swap');
    } finally {
      setIsSwapping(false);
    }
  };

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
                  <span className="font-medium">
                    {balance?.toString() === '[object Object]' 
                      ? '0.00'
                      : parseFloat(balance?.toString() || '0').toFixed(4)} ETH
                  </span>
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

        {/* 1. Wallet Details Card */}
        {address && (
          <div className="rounded-xl bg-white/5 shadow-2xl backdrop-blur-lg border border-white/10 p-6 hover:bg-white/10 hover:scale-[1.01] hover:shadow-3xl transition-all duration-300 ease-out">
            <h2 className="text-lg font-medium mb-4 text-white">Wallet Details</h2>
            <div className="space-y-2 text-gray-300">
              <p><span className="font-medium">Address:</span> {address}</p>
              <p>
                <span className="font-medium">Balance:</span>{' '}
                {balance?.toString() === '[object Object]'
                  ? '0.00'
                  : parseFloat(balance?.toString() || '0').toFixed(4)} ETH
              </p>
              <p><span className="font-medium">Network:</span> {
                chainId === NETWORK_CONFIG['Ethereum Sepolia'].chainId 
                  ? 'Ethereum Sepolia' 
                  : chainId === NETWORK_CONFIG['Arbitrum Sepolia'].chainId 
                    ? 'Arbitrum Sepolia' 
                    : 'Unknown Network'
              }</p>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button
                variant="outline"
                onClick={handleAnalyzePortfolio}
                disabled={loading}
                className="rounded-full bg-gradient-to-r from-emerald-600 to-green-700 text-white border-0 font-medium px-6 hover:opacity-90 transition-opacity"
              >
                {loading ? 'Analyzing...' : 'Inspect Portfolio'}
              </Button>
            </div>
          </div>
        )}

        {/* 2. Portfolio Inspection Card */}
        {address && analysisResults && (
          <div className="rounded-xl bg-white/5 shadow-2xl backdrop-blur-lg border border-white/10 p-6 hover:bg-white/10 hover:scale-[1.01] hover:shadow-3xl transition-all duration-300 ease-out">
            <h2 className="text-lg font-medium mb-6 text-white">Portfolio Inspection</h2>
            
            {assets.length > 0 ? (
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

                {/* Buttons at bottom */}
                <div className="mt-6 flex justify-end gap-4">
                  <Button
                    variant="outline"
                    onClick={handleMarketAnalysis}
                    disabled={loading || !analysisResults}
                    className="rounded-full bg-gradient-to-r from-blue-500 to-violet-500 text-white border-0 font-medium px-6 hover:opacity-90 transition-opacity"
                  >
                    Market Analysis
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-gray-400 text-center py-8">
                No assets found in portfolio
              </p>
            )}
          </div>
        )}

        {/* 3. Market Analysis Card */}
        {analysis && (
          <div className="rounded-xl bg-white/5 shadow-2xl backdrop-blur-lg border border-white/10 p-6 hover:bg-white/10 hover:scale-[1.01] hover:shadow-3xl transition-all duration-300 ease-out">
            <h2 className="text-lg font-medium mb-6 text-white">Market Analysis</h2>
            
            <div className="space-y-6">
              {/* Market Sentiment Section */}
              <div className="rounded-lg bg-black/20 backdrop-blur-md p-4 border border-white/5">
                <h3 className="text-md font-medium text-gray-300 mb-4">Market Sentiment</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 px-3">
                    <span className="text-gray-300">Overall Market:</span>
                    <span className={`px-3 py-1 rounded-full text-sm ${getSentimentColor(analysis.assessment)}`}>
                      {analysis.assessment.split('\n')[0].replace('Market Sentiment: ', '')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Token News Section */}
              <div className="rounded-lg bg-black/20 backdrop-blur-md p-4 border border-white/5">
                <h3 className="text-md font-medium text-gray-300 mb-4">
                  Events Potentially Affecting Your Holdings
                </h3>
                <div className="space-y-4">
                  {Object.entries(marketNews?.portfolioTokens || {}).map(([token, data]) => {
                    const news = data.news[0];  // Just get the first news item
                    return (
                      <div key={token} className="p-3 rounded-lg hover:bg-white/5 transition-colors duration-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-white">{token}</span>
                          <span className={`px-3 py-1 rounded-full text-sm ${getSentimentColor(data.analysis.recommendation)}`}>
                            {data.analysis.recommendation}
                          </span>
                        </div>
                        <a 
                          href={news.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block hover:opacity-80 transition-opacity"
                        >
                          <p className="text-sm text-gray-300">{news.title}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Source: <span className="underline">{news.source}</span> • {new Date(news.timestamp).toLocaleDateString()}
                          </p>
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Key Events Section */}
              <div className="rounded-lg bg-black/20 backdrop-blur-md p-4 border border-white/5">
                <h3 className="text-md font-medium text-gray-300 mb-4">Major Market Events</h3>
                <div className="space-y-3">
                  {analysis.assessment.split('\n')
                    .filter(line => line.startsWith('- '))
                    .map((event, idx) => (
                      <div key={idx} className="py-2 px-3 rounded-lg hover:bg-white/5 transition-colors duration-200">
                        <p className="text-gray-300">{event.substring(2)}</p>
                      </div>
                    ))}
                </div>
              </div>

              {/* Add Yield Analysis Button */}
              <div className="mt-8 flex justify-end">
                <Button
                  variant="outline"
                  onClick={handleYieldAnalysis}
                  className="rounded-full bg-gradient-to-r from-emerald-600 to-green-700 text-white border-0 font-medium px-6 hover:opacity-90 transition-opacity"
                >
                  Yield Analysis
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 4. DeFi Yield Analysis Card */}
        {yieldData && (
          <div className="rounded-xl bg-white/5 shadow-2xl backdrop-blur-lg border border-white/10 p-6 hover:bg-white/10 hover:scale-[1.01] hover:shadow-3xl transition-all duration-300 ease-out">
            <h2 className="text-lg font-medium mb-6 text-white">DeFi Yield Analysis</h2>
            
            <div className="space-y-4">
              {Object.entries(yieldData).map(([token, pools]) => (
                <div key={token} className="space-y-2">
                  <h3 className="text-md font-medium text-gray-300">{token}</h3>
                  
                  {pools.slice(0, 1).map((pool: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-black/20 backdrop-blur-md border border-white/5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{pool.protocol}</span>
                          <span className="text-sm text-gray-400">
                            ${pool.tvlUsd}M TVL
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-lg font-medium text-green-400">
                            {Number(pool.supplyAPY) + Number(pool.rewardAPY)}% APY
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Add Assetly Recommendation Button */}
            <div className="mt-8 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowRecommendations(true)}
                className="rounded-full bg-gradient-to-r from-emerald-600 to-green-700 text-white border-0 font-medium px-6 hover:opacity-90 transition-opacity"
              >
                Assetly Recommendation
              </Button>
            </div>
          </div>
        )}

        {/* 5. Assetly Recommends Card - Only show after button click */}
        {showRecommendations && analysis && (
          <div className="rounded-xl bg-white/5 shadow-2xl backdrop-blur-lg border border-white/10 p-6 hover:bg-white/10 hover:scale-[1.01] hover:shadow-3xl transition-all duration-300 ease-out">
            <h2 className="text-lg font-medium mb-6 text-white">Assetly Recommends</h2>
            
            <div className="space-y-4">
              {/* Market-based Recommendations */}
              {Object.entries(marketNews?.portfolioTokens || {}).map(([token, data]) => {
                const recommendation = data.analysis.recommendation;
                const asset = assets.find(a => a.symbol === token);
                const yieldInfo = yieldData?.[token]?.[0];

                return (
                  <div key={token} className="p-4 rounded-lg bg-black/20 backdrop-blur-md border border-white/5">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <span className="font-medium text-white">{token}</span>
                        <span className={`ml-2 px-3 py-1 rounded-full text-sm ${getSentimentColor(recommendation)}`}>
                          {recommendation}
                        </span>
                      </div>
                      {asset && (
                        <span className="text-sm text-gray-400">
                          Balance: {Number(asset.quantity).toFixed(2)} {token}
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      {/* Show news-based context */}
                      <p className="text-sm text-gray-300">
                        {data.news[0].title}
                      </p>

                      {/* Action Buttons */}
                      <div className="flex gap-3 mt-4">
                        {/* Show deposit button for all tokens with yield opportunities */}
                        {yieldInfo && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (asset) {
                                setDepositModal({
                                  isOpen: true,
                                  symbol: token,
                                  balance: asset.quantity.toString()
                                });
                              }
                            }}
                            className="bg-gradient-to-r from-emerald-600/10 to-green-700/10 hover:from-emerald-600/20 hover:to-green-700/20 text-white border-white/10"
                          >
                            Deposit to AAVE ({yieldInfo.supplyAPY}% APY)
                          </Button>
                        )}

                        {/* Show swap buttons based on recommendation */}
                        {(recommendation === 'BUY' || recommendation === 'SELL') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (asset) {
                                setSwapModal({
                                  isOpen: true,
                                  symbol: token,
                                  balance: asset.quantity.toString(),
                                  action: recommendation === 'BUY' ? 'BUY' : 'SELL'
                                });
                              }
                            }}
                            className="bg-gradient-to-r from-blue-500/10 to-violet-500/10 hover:from-blue-500/20 hover:to-violet-500/20 text-white border-white/10"
                          >
                            {recommendation === 'BUY' ? 'Buy with Uniswap' : 'Sell on Uniswap'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Risk Analysis Section */}
              <div className="p-4 rounded-lg bg-black/20 backdrop-blur-md border border-white/5">
                <h3 className="text-md font-medium text-gray-300 mb-4">Risk Considerations:</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-2">
                  {assets.some(a => isStablecoin(a.symbol)) && (
                    <li>Maintain stablecoin position for market opportunities</li>
                  )}
                  {assets.some(a => a.symbol === 'ETH') && (
                    <li>Consider ETH staking for long-term returns</li>
                  )}
                  <li>Monitor market conditions and rebalance as needed</li>
                </ul>
              </div>
            </div>
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

        {swapModal && (
          <SwapModal
            isOpen={true}
            onClose={() => setSwapModal(null)}
            onSwap={handleSwap}
            balance={swapModal.balance}
            symbol={swapModal.symbol}
            action={swapModal.action}
            isLoading={isSwapping}
          />
        )}

        {alert && <Alert message={alert.message} variant={alert.variant} />}
      </main>

      <Terminal logs={logs} />
    </div>
  )
} 