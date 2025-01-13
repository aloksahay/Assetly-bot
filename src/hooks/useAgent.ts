import { useState } from 'react';
import { AgentConfig, AgentResponse } from '@/utils/types';

export function useAgent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<AgentResponse[]>([]);

  const agent = {
    async analyze(data: any) {
      setLoading(true);
      setError(null);
      
      try {
        return {
          message: 'Analysis complete',
          data: {}
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Analysis failed');
        throw err;
      } finally {
        setLoading(false);
      }
    }
  };

  return {
    agent,
    loading,
    error,
    responses
  };
} 