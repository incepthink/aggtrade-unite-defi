// pages/api/proxy/1inch/orderbook/cancel-order.ts
import { NextApiRequest, NextApiResponse } from "next";

const ONEINCH_KEY = process.env.ONEINCH_KEY;
const ONEINCH_BASE_URL = "https://api.1inch.dev";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { chainId, orderHash } = req.query;

  if (!chainId || !orderHash) {
    return res
      .status(400)
      .json({ error: "chainId and orderHash are required" });
  }

  if (!ONEINCH_KEY) {
    return res.status(500).json({ error: "1inch API key not configured" });
  }

  try {
    const response = await fetch(
      `${ONEINCH_BASE_URL}/orderbook/v4.0/${chainId}/${orderHash}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${ONEINCH_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`1inch Orderbook API error: ${response.status}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Cancel order API error:", error);
    res.status(500).json({ error: "Failed to cancel order" });
  }
}
