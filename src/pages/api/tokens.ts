// src/pages/api/tokens.ts
import type { NextApiRequest, NextApiResponse } from "next";

interface OneInchToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoURI?: string;
}

interface OneInchTokensResponse {
  tokens: Record<string, OneInchToken>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { chainId = "1" } = req.query; // Default to Ethereum mainnet

    const response = await fetch(
      `https://api.1inch.dev/token/v1.2/${chainId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.ONEINCH_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`1inch API error: ${response.status}`);
    }

    const data: OneInchTokensResponse = await response.json();

    // Return the tokens data
    res.status(200).json(data);
  } catch (error) {
    console.error("Tokens API error:", error);
    res.status(500).json({ error: "Failed to fetch tokens" });
  }
}
