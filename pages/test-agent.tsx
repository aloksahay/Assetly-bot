import { useState } from 'react';

export default function TestBrianAgent() {
  const [response, setResponse] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const testChain = async () => {
    setLoading(true);
    try {
      const result = await fetch('/api/brian-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });
      const data = await result.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setResponse('Error: ' + (error as Error).message);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Brian AI Chain</h1>
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt"
          style={{ width: '300px', marginRight: '10px' }}
        />
        <button 
          onClick={testChain}
          disabled={loading || !prompt}
        >
          {loading ? 'Running Chain...' : 'Run Chain'}
        </button>
      </div>
      <pre style={{ marginTop: '20px', whiteSpace: 'pre-wrap' }}>
        {response}
      </pre>
    </div>
  );
} 