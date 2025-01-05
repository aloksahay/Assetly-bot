import { useState } from 'react'
import { Button } from './ui/button'
import { ethers } from 'ethers'
import { Loader2 } from 'lucide-react'

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
  onDeposit: (amount: string) => Promise<void>
  balance: string
  symbol: string
  isLoading?: boolean
}

export function DepositModal({ isOpen, onClose, onDeposit, balance, symbol, isLoading }: DepositModalProps) {
  const [amount, setAmount] = useState('0')
  const maxAmount = parseFloat(balance)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800/90 rounded-lg p-6 w-96 border border-white/10">
        <h3 className="text-lg font-medium text-white mb-4">Deposit {symbol}</h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-300">Amount</label>
            <input
              type="range"
              min="0"
              max={maxAmount}
              step={maxAmount / 100}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full"
              disabled={isLoading}
            />
            <div className="flex justify-between text-sm text-gray-400">
              <span>0</span>
              <span>{Number(amount).toFixed(2)} {symbol}</span>
              <span>{Number(maxAmount).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 text-white hover:text-white"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => onDeposit(amount)}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-violet-500"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Depositing...
                </>
              ) : (
                'Deposit'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 