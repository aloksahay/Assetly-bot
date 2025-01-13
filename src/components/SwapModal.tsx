import { Dialog } from '@headlessui/react';
import { Button } from './ui/button';

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwap: (amount: string) => Promise<void>;
  balance: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  isLoading: boolean;
}

export function SwapModal({
  isOpen,
  onClose,
  onSwap,
  balance,
  symbol,
  action,
  isLoading
}: SwapModalProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-sm rounded bg-white p-6">
          <Dialog.Title className="text-lg font-medium">
            {action} {symbol}
          </Dialog.Title>
          {/* Add swap form content here */}
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 