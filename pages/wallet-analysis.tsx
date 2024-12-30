'use client';
import { useState } from 'react';

export default function WalletAnalysis() {
  const [address, setAddress] = useState('');
  const [chain, setChain] = useState('ethereum');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyzeWallet = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const response = await fetch('/api/analyze-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, chain })
      });
      const data = await response.json();
      setAnalysis(data);
    } catch (error) {
      console.error(error);
      setAnalysis({ error: 'Analysis failed' });
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Portfolio Analysis</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter wallet address (0x...)"
          style={{ width: '300px', marginRight: '10px' }}
        />
        <select 
          value={chain}
          onChange={(e) => setChain(e.target.value)}
          style={{ marginRight: '10px' }}
        >
          <option value="ethereum">Ethereum</option>
          <option value="arbitrum">Arbitrum</option>
          <option value="optimism">Optimism</option>
          <option value="polygon">Polygon</option>
          <option value="base">Base</option>
        </select>
        <button
          onClick={analyzeWallet}
          disabled={loading || !address}
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {analysis && (
        <pre style={{ whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(analysis, null, 2)}
        </pre>
      )}
    </div>
  );
} 