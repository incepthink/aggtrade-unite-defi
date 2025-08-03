// pages/api/proxy/1inch/orderbook/create-order.ts
import { NextApiRequest, NextApiResponse } from "next";

const ONEINCH_KEY = process.env.ONEINCH_KEY;
const ONEINCH_BASE_URL = "https://api.1inch.dev";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { chainId, orderData } = req.body;

  if (!chainId || !orderData) {
    return res
      .status(400)
      .json({ error: "chainId and orderData are required" });
  }

  if (!ONEINCH_KEY) {
    return res.status(500).json({ error: "1inch API key not configured" });
  }

  try {
    const response = await fetch(
      `${ONEINCH_BASE_URL}/orderbook/v4.0/${chainId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ONEINCH_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `1inch Orderbook API error: ${response.status} - ${errorData}`
      );
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Create order API error:", error);
    res.status(500).json({ error: "Failed to create limit order" });
  }
}
