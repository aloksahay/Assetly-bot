type BrianRequestType = 'ask' | 'transact' | 'extract' | 'generateCode';

interface BrianRequest {
  prompt: string;
  type: BrianRequestType;
  address?: string; // Optional, used for transactions
}

export async function callBrianAI(request: BrianRequest) {
  try {
    const response = await fetch('/api/brian', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    return await response.json();
  } catch (error) {
    console.error('Error calling Brian AI:', error);
    throw error;
  }
} 