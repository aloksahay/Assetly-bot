import { useState, useEffect } from 'react';

export function useAgent() {
  const [agent, setAgent] = useState<any>(null);

  useEffect(() => {
    // Initialize agent
    setAgent({});
  }, []);

  return { agent };
} 