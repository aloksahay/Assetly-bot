import { BrianSDK } from "@brian-ai/sdk";
import { NextApiRequest, NextApiResponse } from "next";

// Initialize Brian SDK - this runs only on the server
const brian = new BrianSDK({
  apiKey: process.env.BRIAN_API_KEY!,
});

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt } = req.body;
    
    // Simple ask endpoint only - more secure
    const response = await brian.ask({
      prompt,
      kb: "public-knowledge-box"
    });
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Brian AI Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 