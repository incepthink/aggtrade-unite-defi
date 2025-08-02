// pages/api/proxy/1inch/fusion/order-history.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      walletAddress,
      limit = "50",
      offset = "0",
      sortBy = "createDateTime",
    } = req.query;

    if (!walletAddress) {
      return res.status(400).json({
        error: "Missing required parameter: walletAddress",
      });
    }

    const url = new URL(
      "https://api.1inch.dev/fusion/relayer/v1.0/1/order/history"
    );
    url.searchParams.set("walletAddress", walletAddress as string);
    url.searchParams.set("limit", limit as string);
    url.searchParams.set("offset", offset as string);
    url.searchParams.set("sortBy", sortBy as string);

    console.log("Getting order history for wallet:", walletAddress);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.ONEINCH_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("1inch Fusion order history error:", errorText);

      let errorMessage = "Failed to get order history";
      if (response.status === 401) {
        errorMessage = "Invalid API key";
      } else if (response.status === 429) {
        errorMessage = "Rate limit exceeded";
      }

      return res.status(response.status).json({
        error: errorMessage,
        details: errorText,
      });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error: any) {
    console.error("Fusion order history error:", error);
    res.status(500).json({
      error: "Failed to get order history",
      details: error.message,
    });
  }
}
