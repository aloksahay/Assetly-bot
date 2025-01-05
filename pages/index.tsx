import { Button } from "@/components/ui/button"
import { useWallet } from "@/hooks/useWallet"
import { EDUCHAIN_CONFIG } from "@/utils/constants"

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
    analysisResults
  } = useWallet()

  // Format assets from Zerion response
  const formatAssets = (data: any): Asset[] => {
    if (!data?.data) return []
    
    return data.data
      .filter((position: any) => 
        // Only include displayable assets that aren't trash
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
              ) : (
                <Button
                  variant="default"
                  onClick={analyzePortfolio}
                  disabled={loading}
                >
                  Analyze Portfolio
                </Button>
              )}
            </div>
          </div>
        )}
        {address && analysisResults && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Portfolio Analysis</h2>
            {assets.length > 0 ? (
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
              </div>
            ) : (
              <p className="text-slate-500">No assets found in this wallet.</p>
            )}
          </div>
        )}
      </main>
    </div>
  )
} 