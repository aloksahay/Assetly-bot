import { useState } from 'react';
import { RPC_URLS } from '../utils/constants';
import { ethers } from 'ethers';

type AnalysisType = 'zerion';

// Add test wallet constants
const TEST_WALLETS = {
  // Binance Hot Wallet (lots of ETH)
  BINANCE: '0x28C6c06298d514Db089934071355E5743bf21d60',
  // Ethereum Foundation
  ETH_FOUNDATION: '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe',
  // Compound
  COMPOUND: '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B'
};

export default function WalletAnalysis() {
  const [address, setAddress] = useState(TEST_WALLETS.BINANCE);
  const [chain, setChain] = useState('ethereum');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [analysisType] = useState<AnalysisType>('zerion');
  const [depositAmount, setDepositAmount] = useState('0.1');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [txDetails, setTxDetails] = useState<any>(null);
  const [testAccounts, setTestAccounts] = useState<Array<{address: string, balance: string}>>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [funding, setFunding] = useState(false);

  const analyzeWallet = async () => {
    if (!address) {
      alert('Please enter a wallet address');
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const response = await fetch('/api/analyze-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, chain })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Analysis failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to analyze wallet');
    } finally {
      setLoading(false);
    }
  };

  const depositToAave = async () => {
    if (!address || !results?.nativeToken?.balance) {
      alert('No ETH balance found');
      return;
    }

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (parseFloat(results.nativeToken.balance) < amount) {
      alert(`Insufficient ETH balance. Need at least ${amount} ETH`);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/brian-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Deposit ${amount} ETH into Aave on Ethereum`,
          address
        })
      });
      const data = await response.json();
      setTxDetails(data);
      setShowConfirmation(true);
    } catch (error) {
      console.error('Deposit failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to deposit to Aave');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeposit = () => {
    setShowConfirmation(false);
    setResults({
      ...results,
      pendingTx: txDetails
    });
  };

  const connectWallet = async () => {
    try {
      const response = await fetch('http://localhost:8545', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_accounts',
          params: [],
          id: 1
        })
      });

      const data = await response.json();
      const accounts = data.result;
      
      // Get balances for each account
      const accountsWithBalance = await Promise.all(
        accounts.map(async (address: string) => {
          const balanceResponse = await fetch('http://localhost:8545', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getBalance',
              params: [address, 'latest'],
              id: 1
            })
          });
          const balanceData = await balanceResponse.json();
          return {
            address,
            balance: parseInt(balanceData.result, 16) / 1e18 + ' ETH'
          };
        })
      );

      setTestAccounts(accountsWithBalance);
      if (accountsWithBalance.length > 0) {
        setSelectedAccount(accountsWithBalance[0].address);
        setAddress(accountsWithBalance[0].address);
      }
    } catch (error) {
      console.error('Failed to get test accounts:', error);
      alert('Failed to connect to local fork');
    }
  };

  const fundWallet = async () => {
    if (!selectedAccount) {
      alert('Please connect a test wallet first');
      return;
    }

    setFunding(true);
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URLS.ethereum);

      // USDC
      const usdcWhale = '0x55FE002aefF02F77364de339a1292923A15844B8';
      await provider.send('anvil_impersonateAccount', [usdcWhale]);
      const usdcSigner = await provider.getSigner(usdcWhale);
      const usdcContract = new ethers.Contract(
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        ['function transfer(address to, uint256 amount) returns (bool)', 'function decimals() view returns (uint8)'],
        usdcSigner
      );
      await usdcContract.transfer(selectedAccount, ethers.parseUnits('200', 6));

      // LINK
      const linkWhale = '0xF977814e90dA44bFA03b6295A0616a897441aceC';
      await provider.send('anvil_impersonateAccount', [linkWhale]);
      const linkSigner = await provider.getSigner(linkWhale);
      const linkContract = new ethers.Contract(
        '0x514910771AF9Ca656af840dff83E8264EcF986CA',
        ['function transfer(address to, uint256 amount) returns (bool)', 'function decimals() view returns (uint8)'],
        linkSigner
      );
      await linkContract.transfer(selectedAccount, ethers.parseUnits('100', 18));

      // Refresh wallet analysis
      analyzeWallet();
    } catch (error) {
      console.error('Funding failed:', error);
      alert('Failed to fund wallet');
    } finally {
      setFunding(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px' }}>
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
        <p className="font-bold">Fork Mode</p>
        <p>Using Ethereum mainnet fork for testing. Connected to: {RPC_URLS.ethereum}</p>
      </div>

      <h1 style={{ marginBottom: '20px' }}>Wallet Analysis</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={connectWallet}
          style={{
            padding: '8px 16px',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '16px'
          }}
        >
          Connect Test Wallet
        </button>

        {testAccounts.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <select
              value={selectedAccount}
              onChange={(e) => {
                setSelectedAccount(e.target.value);
                setAddress(e.target.value);
              }}
              style={{ width: '100%', padding: '8px', marginBottom: '16px' }}
            >
              {testAccounts.map((account) => (
                <option key={account.address} value={account.address}>
                  {account.address} ({account.balance})
                </option>
              ))}
            </select>

            <button
              onClick={fundWallet}
              disabled={funding}
              style={{
                padding: '8px 16px',
                background: '#FF9800',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginBottom: '16px'
              }}
            >
              {funding ? 'Funding...' : 'Add Test Tokens (+200 USDC, +100 LINK)'}
            </button>
          </div>
        )}

        <label style={{ display: 'block', marginBottom: '8px' }}>Chain</label>
        <select 
          value={chain}
          onChange={(e) => setChain(e.target.value)}
          style={{ width: '100%', padding: '8px', marginBottom: '16px' }}
        >
          <option value="ethereum">Ethereum (Mainnet Fork)</option>
          <option value="arbitrum">Arbitrum (Sepolia)</option>
          <option value="base">Base (Goerli)</option>
        </select>

        <button 
          onClick={analyzeWallet}
          style={{ 
            padding: '8px 16px', 
            background: '#0070f3', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer' 
          }}
        >
          {loading ? 'Analyzing...' : 'Analyze Wallet'}
        </button>
      </div>

      {loading && <div>Loading...</div>}

      {results && (
        <div>
          <h2 style={{ marginBottom: '16px' }}>Token Balances</h2>
          <pre style={{ background: '#f5f5f5', padding: '16px', overflow: 'auto' }}>
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}

      {results?.nativeToken?.balance && (
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="Amount in ETH"
            style={{
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              width: '120px'
            }}
            min="0.01"
            step="0.01"
          />
          <button
            onClick={depositToAave}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {loading ? 'Processing...' : 'Deposit ETH to Aave'}
          </button>
        </div>
      )}

      {results?.pendingTx && (
        <div style={{ marginTop: '20px' }}>
          <h3>Pending Transaction</h3>
          <pre style={{ background: '#f5f5f5', padding: '16px' }}>
            {JSON.stringify(results.pendingTx, null, 2)}
          </pre>
        </div>
      )}

      {showConfirmation && txDetails && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{ marginBottom: '16px' }}>Confirm Transaction</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <p><strong>Action:</strong> Deposit to Aave</p>
              <p><strong>Amount:</strong> {depositAmount} ETH</p>
              <p><strong>From:</strong> {address}</p>
              {txDetails.gas && (
                <p><strong>Estimated Gas:</strong> {txDetails.gas}</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfirmation(false)}
                style={{
                  padding: '8px 16px',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeposit}
                style={{
                  padding: '8px 16px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Confirm Deposit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 