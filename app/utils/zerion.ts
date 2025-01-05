const ZERION_API_KEY = process.env.ZERION_API_KEY;
const BASE_URL = 'https://api.zerion.io/v1';

interface ZerionConfig {
  address: string;
  currency?: string;
}

export async function getWalletPortfolio({ address, currency = 'usd' }: ZerionConfig) {
  try {
    const response = await fetch(
      `${BASE_URL}/wallets/${address}/portfolio?currency=${currency}`, 
      {
        headers: {
          'accept': 'application/json',
          'authorization': `Basic ${ZERION_API_KEY}`
        },
        next: { revalidate: 60 } // Cache for 60 seconds
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Zerion API error:', error);
    throw error;
  }
} 