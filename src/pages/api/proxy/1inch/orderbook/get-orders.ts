// pages/api/proxy/1inch/orderbook/get-orders.ts
import { NextApiRequest, NextApiResponse } from "next";

const ONEINCH_KEY = process.env.ONEINCH_KEY;
const ONEINCH_BASE_URL = "https://api.1inch.dev";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    chainId,
    address,
    page = "1",
    limit = "100",
    statuses,
    sortBy,
    takerAsset,
    makerAsset,
  } = req.query;

  if (!chainId || !address) {
    return res.status(400).json({ error: "chainId and address are required" });
  }

  if (!ONEINCH_KEY) {
    return res.status(500).json({ error: "1inch API key not configured" });
  }

  try {
    const params = new URLSearchParams({
      page: page as string,
      limit: limit as string,
    });

    // Add optional parameters
    if (statuses) {
      params.append("statuses", statuses as string);
    }

    if (sortBy) {
      params.append("sortBy", sortBy as string);
    }

    if (takerAsset) {
      params.append("takerAsset", takerAsset as string);
    }

    if (makerAsset) {
      params.append("makerAsset", makerAsset as string);
    }

    const response = await fetch(
      `${ONEINCH_BASE_URL}/orderbook/v4.0/${chainId}/address/${address}?${params}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${ONEINCH_KEY}`,
          "Content-Type": "application/json",
        },
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
    console.error("Get orders API error:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
}
