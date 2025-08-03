// pages/api/proxy/1inch/token-prices.ts
import { NextApiRequest, NextApiResponse } from "next";

const ONEINCH_API_KEY = process.env.ONEINCH_KEY;
const ONEINCH_BASE_URL = "https://api.1inch.dev";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { tokens } = req.query;

  if (!tokens) {
    return res.status(400).json({ error: "tokens parameter is required" });
  }

  if (!ONEINCH_API_KEY) {
    return res.status(500).json({ error: "1inch API key not configured" });
  }

  try {
    const response = await fetch(
      `${ONEINCH_BASE_URL}/price/v1.1/1?tokens=${tokens}&currency=USD`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${ONEINCH_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`1inch API error: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Token prices API error:", error);
    res.status(500).json({ error: "Failed to fetch token prices" });
  }
}
