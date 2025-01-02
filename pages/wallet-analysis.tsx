import { useState } from 'react';

export default function WalletAnalysis() {
  const [address, setAddress] = useState('');
  const [chain, setChain] = useState('ethereum');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

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
      alert('Failed to analyze wallet');
    } finally {
      setLoading(false);
    }
  };

  const TestnetWarning = () => (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
      <p className="font-bold">Testnet Mode</p>
      <p>This application is running on test networks. Use test tokens only.</p>
    </div>
  );

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px' }}>
      <TestnetWarning />
      <h1 style={{ marginBottom: '20px' }}>Wallet Analysis</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px' }}>Wallet Address</label>
        <input 
          type="text" 
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="0x..."
          style={{ width: '100%', padding: '8px', marginBottom: '16px' }}
        />

        <label style={{ display: 'block', marginBottom: '8px' }}>Chain</label>
        <select 
          value={chain}
          onChange={(e) => setChain(e.target.value)}
          style={{ width: '100%', padding: '8px', marginBottom: '16px' }}
        >
          <option value="ethereum">Ethereum</option>
          <option value="arbitrum">Arbitrum</option>
          <option value="base">Base</option>
        </select>

        <button 
          onClick={analyzeWallet}
          style={{ padding: '8px 16px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Analyze Wallet
        </button>
      </div>

      {loading && <div>Loading...</div>}

      {results && (
        <pre style={{ background: '#f5f5f5', padding: '16px' }}>
          {JSON.stringify(results, null, 2)}
        </pre>
      )}
    </div>
  );
} 