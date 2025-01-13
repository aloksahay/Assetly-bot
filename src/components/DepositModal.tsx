import { Dialog } from '@headlessui/react'
import { Button } from './ui/button'
import { useState } from 'react'

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeposit: (amount: string) => Promise<void>;
  balance: string;
  symbol: string;
  isLoading: boolean;
}

export function DepositModal({
  isOpen,
  onClose,
  onDeposit,
  balance,
  symbol,
  isLoading
}: DepositModalProps) {
  const [amount, setAmount] = useState('')

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-sm rounded bg-white p-6">
          <Dialog.Title className="text-lg font-medium">
            Deposit {symbol}
          </Dialog.Title>
          <div className="mt-4">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Enter amount (max: ${balance})`}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              onClick={() => onDeposit(amount)}
              disabled={isLoading || !amount}
            >
              {isLoading ? 'Depositing...' : 'Deposit'}
            </Button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
} 