// pages/api/proxy/1inch/fusion/status.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { orderHash } = req.query;

    if (!orderHash) {
      return res.status(400).json({
        error: "Missing required parameter: orderHash",
      });
    }

    const url = `https://api.1inch.dev/fusion/relayer/v1.0/1/order/status/${orderHash}`;

    console.log("Checking order status for:", orderHash);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.ONEINCH_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("1inch Fusion status error:", errorText);

      let errorMessage = "Failed to get order status";
      if (response.status === 404) {
        errorMessage = "Order not found";
      } else if (response.status === 401) {
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
    console.error("Fusion status error:", error);
    res.status(500).json({
      error: "Failed to get order status",
      details: error.message,
    });
  }
}
