interface NewsResponse {
  data: Array<{
    news_url: string;
    image_url: string;
    title: string;
    text: string;
    source_name: string;
    date: string;
    topics: string[];
    sentiment: 'Positive' | 'Negative' | 'Neutral';
    type: string;
    tickers: string[];
  }>;
  total_pages: number;
  total_items: number;
}

export async function getNews(token: string = '', items: number = 3) {
  try {
    const API_KEY = process.env.CRYPTONEWS_API_KEY;
    if (!API_KEY) {
      throw new Error('CRYPTONEWS_API_KEY is not configured');
    }

    const baseUrl = 'https://cryptonews-api.com/api/v1';
    
    // Use different endpoints for general news vs token-specific news
    const url = token 
      ? `${baseUrl}?tickers=${token}&items=${items}&page=1&token=${API_KEY}`
      : `${baseUrl}/category?section=general&items=${items}&page=1&token=${API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch news');
    }
    
    return data;
  } catch (error) {
    console.error('CryptoNews API error:', error);
    return {
      data: [],
      total_pages: 0,
      total_items: 0
    };
  }
}

// Get sentiment analysis for a specific token
export async function getTokenSentiment(token: string) {
  try {
    const API_KEY = process.env.CRYPTONEWS_API_KEY;
    if (!API_KEY) {
      throw new Error('CRYPTONEWS_API_KEY is not configured');
    }

    const url = `https://cryptonews-api.com/api/v1/sentiment?tickers=${token}&token=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch sentiment');
    }

    return data;
  } catch (error) {
    console.error('CryptoNews Sentiment API error:', error);
    return {
      sentiment: 0,
      total_items: 0
    };
  }
} 