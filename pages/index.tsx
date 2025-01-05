import { Button } from "@/components/ui/button"
import { useWallet } from "@/hooks/useWallet"
import { EDUCHAIN_CONFIG } from "@/utils/constants"

export default function HomePage() {
  const { 
    address, 
    balance, 
    loading, 
    error, 
    isSubscribed,
    connectWallet, 
    sendTransaction,
    analyzePortfolio 
  } = useWallet()

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
      </main>
    </div>
  )
} 