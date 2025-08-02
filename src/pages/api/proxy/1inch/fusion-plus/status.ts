// pages/api/proxy/1inch/fusion-plus/status.ts
import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { orderHash, srcChain, dstChain } = req.query;

    // Validate required parameters
    if (!orderHash) {
      return res.status(400).json({
        error: "Missing required parameter: orderHash",
      });
    }

    // Validate orderHash format
    if (
      typeof orderHash !== "string" ||
      orderHash.length !== 66 ||
      !orderHash.startsWith("0x")
    ) {
      return res.status(400).json({
        error:
          "Invalid orderHash format. Must be a 66-character hex string starting with 0x",
      });
    }

    const url = `https://api.1inch.dev/fusion-plus/relayer/v1.0/order/status/${orderHash}`;

    console.log("Fusion+ status request:", {
      url,
      orderHash,
      srcChain,
      dstChain,
    });

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${process.env.ONEINCH_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (response.status !== 200) {
      console.error("1inch Fusion+ status error:", response.data);

      let errorMessage = "Failed to get Fusion+ order status";
      if (response.status === 404) {
        errorMessage = "Order not found";
      } else if (response.status === 401) {
        errorMessage = "Invalid API key";
      } else if (response.status === 429) {
        errorMessage = "Rate limit exceeded";
      }

      return res.status(response.status).json({
        error: errorMessage,
        details: response.data,
      });
    }

    const data = response.data;

    // Add cross-chain specific info to response
    const result = {
      ...data,
      crossChainInfo: {
        srcChain: srcChain || "unknown",
        dstChain: dstChain || "unknown",
        swapType: "fusion-plus",
        orderHash,
      },
      metadata: {
        checkedAt: new Date().toISOString(),
        apiVersion: "v1.0",
      },
    };

    console.log("Fusion+ status check successful:", {
      orderHash,
      status: data.status,
      srcChain,
      dstChain,
    });

    res.status(200).json(result);
  } catch (error: any) {
    console.error("Fusion+ status check error:", error);

    // Handle specific error cases
    if (error.response?.status === 404) {
      return res.status(404).json({
        error: "Order not found or has expired",
        details: error.response.data,
      });
    }

    res.status(500).json({
      error: "Failed to check Fusion+ order status",
      details: error.message,
    });
  }
}
